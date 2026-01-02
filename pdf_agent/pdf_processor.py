"""
PDF 处理工具类
将 PDF 文件转换为图像，供视觉模型处理
"""
import os
import io
import base64
from typing import List
from PIL import Image
import fitz  # PyMuPDF


class PDFProcessor:
    """PDF 处理器，负责将 PDF 转换为图像"""
    
    def __init__(self, dpi: int = 300):
        """
        初始化 PDF 处理器
        
        Args:
            dpi: 图像分辨率，默认 300 DPI
        """
        self.dpi = dpi
    
    def pdf_to_images(self, pdf_path: str) -> List[Image.Image]:
        """
        将 PDF 文件转换为图像列表
        
        Args:
            pdf_path: PDF 文件路径
        
        Returns:
            图像列表，每个元素是一页 PDF 的图像
        """
        images = []
        
        try:
            # 打开 PDF 文件
            doc = fitz.open(pdf_path)
            
            # 遍历每一页
            for page_num in range(len(doc)):
                page = doc[page_num]
                
                # 设置缩放因子（DPI/72，因为 PDF 默认是 72 DPI）
                zoom = self.dpi / 72.0
                mat = fitz.Matrix(zoom, zoom)
                
                # 渲染页面为图像
                pix = page.get_pixmap(matrix=mat)
                
                # 转换为 PIL Image
                img_data = pix.tobytes("png")
                img = Image.open(io.BytesIO(img_data))
                
                images.append(img)
            
            doc.close()
            
        except Exception as e:
            raise Exception(f"PDF 处理失败: {str(e)}")
        
        return images
    
    def image_to_base64(self, image: Image.Image) -> str:
        """
        将 PIL Image 转换为 base64 编码的字符串
        
        Args:
            image: PIL Image 对象
        
        Returns:
            base64 编码的图像字符串（data URL 格式）
        """
        import io
        
        # 将图像转换为字节
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        img_bytes = buffer.getvalue()
        
        # 转换为 base64
        img_base64 = base64.b64encode(img_bytes).decode('utf-8')
        
        return f"data:image/png;base64,{img_base64}"

