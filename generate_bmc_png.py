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
         "- Provedores de Dados (Econodata,\n  CNPJ Biz)\n- Nuvem e Telecom (AWS, Twilio)\n- Consultorias Jurídicas (LGPD)"),
        
        (pad_x_left + col_w, pad_y_top, pad_x_left + 2*col_w, mid_h1, "7. Atividades Principais", 
         "- Desenvolvimento Multi-Fases\n- Treinamento de IA (Llama3)\n- Gestão de Infraestrutura e BD\n- Auditoria de Conformidade (LGPD)"),
        
        (pad_x_left + col_w, mid_h1, pad_x_left + 2*col_w, pad_y_mid, "6. Recursos Principais", 
         "- Tecnológicos: Crawlers, Llama3, BD\n- Intelectuais: Arquitetura, Prompts\n- Humanos: Devs, PO, SM, ESG/Jurídico"),

        (pad_x_left + 2*col_w, pad_y_top, pad_x_left + 3*col_w, pad_y_mid, "2. Proposta de Valor", 
         "- Aumento de Produtividade Comercial\n- Enriquecimento Secundário via IA\n  (nome, e-mail, telefone, cargo)\n- Pesquisa Primária e Validação\n  (Robôs de Voz/WhatsApp)\n- Conformidade rígida com a LGPD"),

        (pad_x_left + 3*col_w, pad_y_top, pad_x_left + 4*col_w, mid_h1, "4. Relacionamento", 
         "- Onboarding e Setup Personalizado\n- Plataforma Self-Service SaaS\n- Suporte Técnico Dedicado"),

        (pad_x_left + 3*col_w, mid_h1, pad_x_left + 4*col_w, pad_y_mid, "3. Canais", 
         "- Vendas Diretas (B2B)\n- Plataforma Web SaaS\n- Integrações de API / Plugins com\n  CRMs (HubSpot, Salesforce)"),

        (pad_x_left + 4*col_w, pad_y_top, pad_x_right, pad_y_mid, "1. Segmentos de Clientes", 
         "- Equipes de Vendas B2B: SDRs e MDRs\n- Gestores de Inteligência Comercial\n- Empresas B2B de médio a grande\n  porte (Outbound Marketing)"),

        (pad_x_left, pad_y_mid, pad_x_left + 2.5*col_w, pad_y_bottom, "9. Estrutura de Custos", 
         "- Infraestrutura na Nuvem (Servers, GPUs p/ IA)\n- Licenças e APIs (WhatsApp API, Busca de Dados)\n- Custos de Pessoal (Dev, Produto, Comercial)\n- Custos Operacionais e Marketing (CAC)"),

        (pad_x_left + 2.5*col_w, pad_y_mid, pad_x_right, pad_y_bottom, "5. Fontes de Receita", 
         "- Modelo de Assinatura Mensal/Anual (SaaS) baseado no volume\n- Pay-per-use para Pesquisa Primária (minutos de IA de voz/chat)\n- Taxas de Setup e Customização de Integrações")
    ]


def generate_bmc() -> Image.Image:
    """Creates the PIL Image for the Business Model Canvas."""
    image = Image.new('RGB', (CANVAS_WIDTH, CANVAS_HEIGHT), 'white')
    draw = ImageDraw.Draw(image)

    title_font, text_font, main_title_font = get_fonts()

    draw.text(
        (CANVAS_WIDTH // 2 - 250, 20),
        "Business Model Canvas - YEB",
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
