import io
import base64
import json
import httpx
from typing import Optional

from config import settings


ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE = 10 * 1024 * 1024


def validate_file(filename: str, content: bytes) -> Optional[str]:
    ext = ""
    if "." in filename:
        ext = filename[filename.rfind("."):].lower()

    if ext not in ALLOWED_EXTENSIONS:
        return f"不支持的文件格式 {ext}，请上传 .docx, .pdf, .txt, .jpg, .png 格式文件"

    if len(content) > MAX_FILE_SIZE:
        return f"文件大小超过限制（最大10MB），当前文件大小: {len(content) / 1024 / 1024:.1f}MB"

    return None


async def extract_text_from_file(filename: str, content: bytes) -> str:
    ext = filename[filename.rfind("."):].lower() if "." in filename else ""

    if ext == ".pdf":
        return await _extract_from_pdf(content)
    elif ext == ".docx":
        return await _extract_from_docx(content)
    elif ext == ".txt":
        return _extract_from_txt(content)
    elif ext in (".jpg", ".jpeg", ".png"):
        return await _extract_from_image(content, ext)
    else:
        raise ValueError(f"不支持的文件格式: {ext}")


async def _extract_from_pdf(content: bytes) -> str:
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(content))
        pages = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                pages.append(page_text)
        text = "\n".join(pages)

        if len(text.strip()) < 20:
            text = await _ocr_with_qwen_vision(content, "pdf")

        return text
    except Exception as e:
        return await _ocr_with_qwen_vision(content, "pdf")


async def _extract_from_docx(content: bytes) -> str:
    try:
        from docx import Document
        doc = Document(io.BytesIO(content))
        paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
        text = "\n".join(paragraphs)

        if len(text.strip()) < 20:
            text = await _ocr_with_qwen_vision(content, "docx")

        return text
    except ImportError:
        return _extract_from_docx_fallback(content)
    except Exception:
        return _extract_from_docx_fallback(content)


def _extract_from_docx_fallback(content: bytes) -> str:
    import zipfile
    import xml.etree.ElementTree as ET

    try:
        with zipfile.ZipFile(io.BytesIO(content)) as z:
            text_parts = []
            for name in z.namelist():
                if name.startswith("word/") and name.endswith(".xml"):
                    xml_content = z.read(name)
                    tree = ET.fromstring(xml_content)
                    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
                    for para in tree.findall(".//w:p", ns):
                        texts = [t.text for t in para.findall(".//w:t", ns) if t.text]
                        if texts:
                            text_parts.append("".join(texts))
            return "\n".join(text_parts)
    except Exception as e:
        raise ValueError(f"DOCX文件解析失败: {str(e)}")


def _extract_from_txt(content: bytes) -> str:
    for encoding in ["utf-8", "gbk", "gb2312", "utf-16"]:
        try:
            return content.decode(encoding)
        except (UnicodeDecodeError, LookupError):
            continue
    raise ValueError("文件编码无法识别，请上传UTF-8或GBK编码的文本文件")


async def _extract_from_image(content: bytes, ext: str) -> str:
    return await _ocr_with_qwen_vision(content, "image", ext)


async def _ocr_with_qwen_vision(content: bytes, file_type: str, ext: str = "") -> str:
    api_key = settings.get_active_api_key()
    base_url = settings.get_active_base_url()

    if not api_key:
        raise ValueError("API Key 未配置，无法使用OCR识别功能")

    b64_content = base64.b64encode(content).decode("utf-8")

    if file_type == "pdf":
        mime_type = "application/pdf"
    elif ext in (".jpg", ".jpeg"):
        mime_type = "image/jpeg"
    elif ext == ".png":
        mime_type = "image/png"
    elif file_type == "image":
        mime_type = "image/png"
    else:
        mime_type = "image/png"

    payload = {
        "model": "qwen-vl-ocr",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{b64_content}"},
                    },
                    {
                        "type": "text",
                        "text": "请识别并提取这个文档中的所有文字内容，保持原始格式和段落结构。只输出识别到的文字，不要添加任何解释。",
                    },
                ],
            }
        ],
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    url = f"{base_url}/chat/completions"

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        if response.status_code != 200:
            raise ValueError(f"OCR识别请求失败: HTTP {response.status_code}")

        result = response.json()
        text = result.get("choices", [{}])[0].get("message", {}).get("content", "")

        if not text.strip():
            raise ValueError("OCR识别结果为空，请检查文件内容")

        return text
