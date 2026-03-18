import os
from PIL import Image, ImageDraw, ImageFont
import textwrap

def generate_bmc():
    width, height = 1920, 1080
    image = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(image)

    # Cores
    border_color = (0, 0, 0)
    bg_color = (250, 250, 250)
    text_color = (30, 30, 30)
    title_color = (0, 102, 204)

    try:
        title_font = ImageFont.truetype("arialbd.ttf", 28)
        text_font = ImageFont.truetype("arial.ttf", 22)
        main_title_font = ImageFont.truetype("arialbd.ttf", 40)
    except IOError:
        # Fallback to default
        title_font = ImageFont.load_default()
        text_font = ImageFont.load_default()
        main_title_font = ImageFont.load_default()

    draw.text((800, 20), "Business Model Canvas - YEB", fill=title_color, font=main_title_font)

    # Geometry constants
    pad_y_top = 80
    pad_y_mid = 740
    pad_y_bottom = 1060
    pad_x_left = 20
    pad_x_right = 1900

    col_w = (pad_x_right - pad_x_left) / 5
    mid_h1 = pad_y_top + (pad_y_mid - pad_y_top) / 2

    # Blocks definition
    # Left, Top, Right, Bottom, Title, Text
    blocks = [
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

    for b in blocks:
        l, t, r, bttm, title, text = b
        draw.rectangle([l, t, r, bttm], outline=border_color, width=3, fill=bg_color)
        draw.text((l + 20, t + 20), title, fill=title_color, font=title_font)
        
        # Write lines
        y_text = t + 80
        for line in text.split('\n'):
            wrapped = textwrap.wrap(line, width=45) if l < pad_x_left + 2.5*col_w and (r - l) < 2.5 * col_w else textwrap.wrap(line, width=100)
            for w in wrapped:
                draw.text((l + 20, y_text), w, fill=text_color, font=text_font)
                y_text += 35

    os.makedirs('docs', exist_ok=True)
    out_path = os.path.join('docs', 'business_model_canvas.png')
    image.save(out_path)
    print(f"Canvas drawn successfully and saved to {out_path}.")

if __name__ == "__main__":
    generate_bmc()
