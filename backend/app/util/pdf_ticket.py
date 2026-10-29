"""Utilidades compartidas para tickets PDF de impresora térmica (58 mm).

Los tickets (cocina, cliente) y el resumen de turno comparten el ancho de papel y
el recorte automático del alto, para que no salga papel en blanco al final.
"""
import copy
from io import BytesIO

from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate

ANCHO_PAGINA = 58 * mm
MARGEN_H = 2 * mm
ANCHO_UTIL = ANCHO_PAGINA - 2 * MARGEN_H

ALTO_MAX = 999 * mm
MARGEN_V = 3 * mm


class _Medidor(SimpleDocTemplate):
    """Anota hasta dónde llegó el contenido en la página."""

    def afterFlowable(self, flowable):
        self.y_final = self.frame._y
        self.relleno_inferior = self.frame._bottomPadding


def construir_pdf_ajustado(story) -> bytes:
    """Genera el PDF con el alto justo del contenido (sin papel en blanco al final).

    1ª pasada: página muy alta, solo para medir cuánto ocupa el contenido.
    2ª pasada: página con ese alto exacto.
    """
    medidor = _Medidor(
        BytesIO(), pagesize=(ANCHO_PAGINA, ALTO_MAX),
        leftMargin=MARGEN_H, rightMargin=MARGEN_H, topMargin=MARGEN_V, bottomMargin=MARGEN_V,
    )
    medidor.build(copy.deepcopy(story))
    # +1 pt de holgura para que un redondeo no empuje el último elemento a otra página
    alto = ALTO_MAX - medidor.y_final + MARGEN_V + medidor.relleno_inferior + 1

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=(ANCHO_PAGINA, alto),
        leftMargin=MARGEN_H, rightMargin=MARGEN_H, topMargin=MARGEN_V, bottomMargin=MARGEN_V,
    )
    doc.build(story)
    return buffer.getvalue()