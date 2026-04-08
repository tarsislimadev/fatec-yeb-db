import os
import textwrap
from typing import List, Tuple, Any

from PIL import Image, ImageDraw, ImageFont
import psd_tools


# --- Constants & Configuration ---
CANVAS_WIDTH = 1920
CANVAS_HEIGHT = 1080
DOCS_DIR = 'docs'
PSD_FILENAME = 'business_model_canvas.psd'
PNG_FILENAME = 'business_model_canvas.png'

# Colors (R, G, B)
BORDER_COLOR = (0, 0, 0)
BG_COLOR = (250, 250, 250)
TEXT_COLOR = (30, 30, 30)
TITLE_COLOR = (0, 102, 204)


def get_fonts() -> Tuple[Any, Any, Any]:
    """Attempts to load fonts, falling back to default if unavailable."""
    try:
        title_font = ImageFont.truetype("arialbd.ttf", 28)
        text_font = ImageFont.truetype("arial.ttf", 22)
        main_title_font = ImageFont.truetype("arialbd.ttf", 40)
    except IOError:
        title_font = ImageFont.load_default()
        text_font = ImageFont.load_default()
        main_title_font = ImageFont.load_default()
    return title_font, text_font, main_title_font


def get_bmc_blocks(
    pad_x_left: float,
    pad_x_right: float,
    pad_y_top: float,
    pad_y_mid: float,
    pad_y_bottom: float,
    col_w: float,
    mid_h1: float
) -> List[Tuple[float, float, float, float, str, str]]:
    """Returns the geometry and content of each BMC block."""
    return [
        (pad_x_left, pad_y_top, pad_x_left + col_w, pad_y_mid, "8. Parcerias Principais",
         "- Provedores de dados CNPJ\n  (BrasilAPI, CNPJA)\n- Provedores WhatsApp oficiais\n  (Meta, Twilio, Gupshup)\n- Cloud e observabilidade\n- Apoio juridico LGPD"),

        (pad_x_left + col_w, pad_y_top, pad_x_left + 2*col_w, mid_h1, "7. Atividades Principais",
         "- Lookup e enriquecimento CNPJ\n- Cache Redis por TTL\n- Fila + worker assinc.\n- Webhook de status e opt-out\n- KPIs de entrega e conversao"),

        (pad_x_left + col_w, mid_h1, pad_x_left + 2*col_w, pad_y_mid, "6. Recursos Principais",
         "- Flask API + RQ worker\n- PostgreSQL + Redis\n- Regras de idempotencia\n  e supressao\n- Time de eng/produto/compliance"),

        (pad_x_left + 2*col_w, pad_y_top, pad_x_left + 3*col_w, pad_y_mid, "2. Proposta de Valor",
         "- Valida e enriquece base B2B\n  com menos custo operacional\n- Separa lookup sincrono\n  de campanhas assincronas\n- Mensageria rastreavel\n  (queued->delivered/read)\n- Compliance e auditoria LGPD"),

        (pad_x_left + 3*col_w, pad_y_top, pad_x_left + 4*col_w, mid_h1, "4. Relacionamento",
         "- Onboarding por playbook\n- Operacao assistida\n- Suporte tecnico\n- Evolucao por KPI"),

        (pad_x_left + 3*col_w, mid_h1, pad_x_left + 4*col_w, pad_y_mid, "3. Canais",
         "- Vendas B2B diretas\n- Plataforma web\n- API para CRM\n- Parcerias de integracao"),

        (pad_x_left + 4*col_w, pad_y_top, pad_x_right, pad_y_mid, "1. Segmentos de Clientes",
         "- SDR/MDR com alto volume\n- RevOps e Intel. comercial\n- Empresas B2B medias\n  e grandes\n- Operacoes com metas\n  de compliance"),

        (pad_x_left, pad_y_mid, pad_x_left + 2.5*col_w, pad_y_bottom, "9. Estrutura de Custos",
         "- Infra de containers, BD\n  e cache\n- Custos de API CNPJ\n  e mensageria\n- Engenharia e suporte\n- Compliance e seguranca"),

        (pad_x_left + 2.5*col_w, pad_y_mid, pad_x_right, pad_y_bottom, "5. Fontes de Receita",
         "- Assinatura SaaS por volume\n  de processamento\n- Uso de mensageria\n  por mensagem/processamento\n- Implementacao e integracao\n  customizada")
    ]


def generate_bmc() -> Image.Image:
    """Creates the PIL Image for the Business Model Canvas."""
    image = Image.new('RGB', (CANVAS_WIDTH, CANVAS_HEIGHT), 'white')
    draw = ImageDraw.Draw(image)

    title_font, text_font, main_title_font = get_fonts()

    draw.text(
        (CANVAS_WIDTH // 2 - 250, 20),
        "Business Model Canvas - YEB (v2)",
        fill=TITLE_COLOR,
        font=main_title_font
    )

    pad_y_top, pad_y_mid, pad_y_bottom = 80, 740, 1060
    pad_x_left, pad_x_right = 20, CANVAS_WIDTH - 20
    col_w = (pad_x_right - pad_x_left) / 5
    mid_h1 = pad_y_top + (pad_y_mid - pad_y_top) / 2

    blocks = get_bmc_blocks(
        pad_x_left, pad_x_right, pad_y_top, pad_y_mid, pad_y_bottom, col_w, mid_h1
    )

    for l, t, r, bttm, title, text in blocks:
        draw.rectangle(
            [l, t, r, bttm],
            outline=BORDER_COLOR,
            width=3,
            fill=BG_COLOR
        )
        draw.text((l + 20, t + 20), title, fill=TITLE_COLOR, font=title_font)
        
        y_text = t + 80
        for line in text.split('\n'):
            # Adaptive wrapping width
            wrap_width = 45 if (r - l) < 2.5 * col_w else 100
            wrapped_lines = textwrap.wrap(line, width=wrap_width)
            for w in wrapped_lines:
                draw.text((l + 20, y_text), w, fill=TEXT_COLOR, font=text_font)
                y_text += 35

    return image


def save_files(image: Image.Image) -> None:
    """Handles directory creation and saving images in PSD and PNG formats."""
    os.makedirs(DOCS_DIR, exist_ok=True)
    
    psd_path = os.path.join(DOCS_DIR, PSD_FILENAME)
    psd_image = psd_tools.PSDImage.frompil(image)
    psd_image.save(psd_path)
    print(f"PSD file generated and saved to {psd_path}.")
    
    png_path = os.path.join(DOCS_DIR, PNG_FILENAME)
    loaded_psd = psd_tools.PSDImage.open(psd_path)
    png_image = loaded_psd.composite()
    png_image.save(png_path)
    print(f"PNG file generated from PSD and saved to {png_path}.")


def main() -> None:
    """Main script logic."""
    print("Generating Business Model Canvas assets...")
    bmc_image = generate_bmc()
    save_files(bmc_image)


if __name__ == "__main__":
    main()
