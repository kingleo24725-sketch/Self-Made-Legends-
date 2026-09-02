#!/usr/bin/env python3
"""
Self-Made Legends — build the factory RFQ / spec sheet.
Copyright (c) 2026 Self-Made Legends LLC. All Rights Reserved.

Usage:  python3 docs/build-rfq.py
Writes: docs/SML-Footwear-RFQ.pdf

────────────────────────────────────────────────────────────────────────────
 WHY THIS DOCUMENT IS SHAPED THE WAY IT IS

 A factory reads an enquiry to decide two things in about thirty seconds:
 does this person know what tooling costs, and are they going to waste my
 time. Most first-time brands fail both, which is why most enquiries get no
 reply.

 So this leads with the tooling position rather than the designs. Saying
 "your existing lasts and outsoles, our upper" up front tells a factory the
 order is quotable at 100-300 pairs instead of 1,000, and that nobody here
 expects a $10,000 steel mould to be absorbed for free.

 It asks for the sandals first. They are one mould family, no last
 development, and the cheapest possible way to have a real product with a
 real cost. The trainer is second. The sculpted-heel models are shown as
 pipeline and deliberately NOT quoted — they are the tooling conversation,
 and it is the wrong conversation to open with.
────────────────────────────────────────────────────────────────────────────
"""

import os
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Image,
    Table, TableStyle, PageBreak, KeepTogether, NextPageTemplate,
)

HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(HERE, '..', 'website', 'assets', 'img', 'concepts')
OUT = os.path.join(HERE, 'SML-Footwear-RFQ.pdf')

INK = colors.HexColor('#14110C')
BODY = colors.HexColor('#33302A')
MUTE = colors.HexColor('#6C675C')
GOLD = colors.HexColor('#8A6B14')
RULE = colors.HexColor('#CFC8B8')
PANEL = colors.HexColor('#F4F1EA')

S = {
    'h1': ParagraphStyle('h1', fontName='Times-Roman', fontSize=21, leading=25, textColor=INK, spaceAfter=4),
    'h2': ParagraphStyle('h2', fontName='Times-Roman', fontSize=14.5, leading=18, textColor=INK, spaceBefore=16, spaceAfter=6),
    'eyebrow': ParagraphStyle('eyebrow', fontName='Helvetica-Bold', fontSize=7.4, leading=11, textColor=GOLD, spaceAfter=5),
    'body': ParagraphStyle('body', fontName='Helvetica', fontSize=9.6, leading=14.2, textColor=BODY, spaceAfter=7),
    'lead': ParagraphStyle('lead', fontName='Helvetica', fontSize=10.6, leading=15.6, textColor=INK, spaceAfter=9),
    'small': ParagraphStyle('small', fontName='Helvetica', fontSize=8.3, leading=12, textColor=MUTE, spaceAfter=5),
    'cap': ParagraphStyle('cap', fontName='Helvetica-Oblique', fontSize=8, leading=11, textColor=MUTE,
                          alignment=TA_CENTER, spaceBefore=4, spaceAfter=10),
    'cellh': ParagraphStyle('cellh', fontName='Helvetica-Bold', fontSize=8.2, leading=11, textColor=INK),
    'cell': ParagraphStyle('cell', fontName='Helvetica', fontSize=8.6, leading=12, textColor=BODY),
}


def rule(w=6.9 * inch):
    t = Table([['']], colWidths=[w], rowHeights=[1])
    t.setStyle(TableStyle([('LINEBELOW', (0, 0), (-1, -1), 0.6, RULE)]))
    return t


def spec_table(rows, widths=(1.5 * inch, 5.4 * inch)):
    data = [[Paragraph(a, S['cellh']), Paragraph(b, S['cell'])] for a, b in rows]
    t = Table(data, colWidths=list(widths))
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (0, -1), 0),
        ('LINEBELOW', (0, 0), (-1, -2), 0.4, RULE),
    ]))
    return t


def sheet(name, width=4.35 * inch):
    """A design sheet. Square, and deliberately not full column width.

    At the full 6.9in a single sheet fills the page and pushes its own spec
    table onto the next one, which is the one place they must not be
    separated — a factory reads the picture and the spec together or it
    reads neither. Smaller here, and they can zoom the PDF."""
    img = Image(os.path.join(ART, name), width=width, height=width)
    img.hAlign = 'CENTER'
    return img


def furniture(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 7)
    canvas.setFillColor(MUTE)
    canvas.drawString(0.85 * inch, 0.55 * inch, 'SELF-MADE LEGENDS LLC  ·  REQUEST FOR QUOTATION  ·  FOOTWEAR')
    canvas.drawRightString(LETTER[0] - 0.85 * inch, 0.55 * inch, str(canvas.getPageNumber()))
    canvas.setStrokeColor(RULE)
    canvas.setLineWidth(0.5)
    canvas.line(0.85 * inch, 0.75 * inch, LETTER[0] - 0.85 * inch, 0.75 * inch)
    canvas.restoreState()


def cover(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(colors.HexColor('#0B0F0D'))
    canvas.rect(0, 0, LETTER[0], LETTER[1], fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor('#CFA529'))
    canvas.setFont('Times-Roman', 40)
    canvas.drawCentredString(LETTER[0] / 2, LETTER[1] - 3.5 * inch, 'SELF-MADE LEGENDS')
    canvas.setFont('Helvetica', 9)
    canvas.setFillColor(colors.HexColor('#8A8577'))
    canvas.drawCentredString(LETTER[0] / 2, LETTER[1] - 3.9 * inch, 'MISSOURI, USA   ·   EST. 2026')
    canvas.setStrokeColor(colors.HexColor('#725D24'))
    canvas.setLineWidth(0.8)
    canvas.line(2.6 * inch, LETTER[1] - 4.35 * inch, LETTER[0] - 2.6 * inch, LETTER[1] - 4.35 * inch)
    canvas.setFillColor(colors.HexColor('#EFEAE0'))
    canvas.setFont('Times-Roman', 21)
    canvas.drawCentredString(LETTER[0] / 2, LETTER[1] - 5.05 * inch, 'Request for Quotation')
    canvas.setFont('Helvetica', 11)
    canvas.setFillColor(colors.HexColor('#A9A296'))
    canvas.drawCentredString(LETTER[0] / 2, LETTER[1] - 5.42 * inch, 'Footwear  ·  First production run')
    canvas.setFont('Helvetica', 9)
    canvas.setFillColor(colors.HexColor('#8A8577'))
    y = 2.5 * inch
    for line in ['Jason D. Brown Jr.  ·  Founder',
                 'info@selfmadelegendsz.com  ·  +1 (816) 466-3083',
                 'selfmadelegendsz.com']:
        canvas.drawCentredString(LETTER[0] / 2, y, line)
        y -= 0.24 * inch
    canvas.restoreState()


def build():
    doc = BaseDocTemplate(OUT, pagesize=LETTER,
                          leftMargin=0.85 * inch, rightMargin=0.85 * inch,
                          topMargin=0.9 * inch, bottomMargin=0.9 * inch,
                          title='Self-Made Legends — Footwear RFQ',
                          author='Self-Made Legends LLC',
                          subject='Request for quotation, footwear, first production run')
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='f')
    doc.addPageTemplates([
        PageTemplate(id='cover', frames=[frame], onPage=cover),
        PageTemplate(id='body', frames=[frame], onPage=furniture),
    ])

    s = []
    # The cover is painted by its own template, not flowed. Without this
    # NextPageTemplate the document stays on the cover template forever and
    # every following page gets the black artwork printed over its text.
    s.append(NextPageTemplate('body'))
    s.append(PageBreak())

    # ── What we are asking for ──────────────────────────────────────────
    s.append(Paragraph('WHAT WE ARE ASKING FOR', S['eyebrow']))
    s.append(Paragraph('A quotation, not a partnership yet', S['h1']))
    s.append(Spacer(1, 6))
    s.append(Paragraph(
        'Self-Made Legends is a luxury streetwear house in Missouri. Our apparel is in production and '
        'selling. We are now placing our first footwear run and are approaching a short list of factories.',
        S['lead']))
    s.append(Paragraph(
        'We are asking you to price two products. We are not asking you to develop a new silhouette, and '
        'we are not asking you to absorb tooling. Both of those come later, and only if the first run sells.',
        S['body']))
    s.append(Spacer(1, 8))
    s.append(rule())
    s.append(Spacer(1, 10))

    s.append(Paragraph('OUR TOOLING POSITION', S['eyebrow']))
    s.append(Paragraph('Your lasts and outsoles. Our upper.', S['h2']))
    s.append(Paragraph(
        'We understand that a steel mould runs from roughly $1,500 to $5,000 <b>per size</b>, and that a '
        'fully bespoke silhouette across a size run means $20,000 or more in tooling before a single pair '
        'exists. That is not this order.',
        S['body']))
    s.append(Paragraph(
        'For this run we want to build on tooling you already own — your existing lasts, midsoles and '
        'outsoles. Everything our customer actually sees is ours: material, colourway, embroidery, '
        'embossing, badges, footbed print, lining, packaging. If that lets you quote at 100 to 300 pairs '
        'per style rather than 1,000, it is the right trade for both of us.',
        S['body']))
    s.append(Paragraph(
        '<b>Please tell us what your standard tooling can already do</b> before you quote anything custom. '
        'We would rather change our design to fit a mould you own than pay to cut a new one.',
        S['body']))
    s.append(Spacer(1, 10))

    s.append(Paragraph('QUANTITIES WE WANT PRICED', S['eyebrow']))
    q = Table([
        [Paragraph('<b>Tier</b>', S['cellh']), Paragraph('<b>Pairs per style</b>', S['cellh']),
         Paragraph('<b>Why we are asking</b>', S['cellh'])],
        [Paragraph('Test', S['cell']), Paragraph('100', S['cell']),
         Paragraph('First run. We expect a higher per-pair price here and accept it.', S['cell'])],
        [Paragraph('Launch', S['cell']), Paragraph('300', S['cell']),
         Paragraph('Our target if the numbers work.', S['cell'])],
        [Paragraph('Repeat', S['cell']), Paragraph('500', S['cell']),
         Paragraph('So we can see where your price breaks.', S['cell'])],
    ], colWidths=[0.9 * inch, 1.3 * inch, 4.7 * inch])
    q.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (0, -1), 8), ('BACKGROUND', (0, 0), (-1, 0), PANEL),
        ('LINEBELOW', (0, 0), (-1, -2), 0.4, RULE),
        ('BOX', (0, 0), (-1, -1), 0.5, RULE),
    ]))
    s.append(q)
    s.append(Spacer(1, 8))
    s.append(Paragraph(
        'Please quote all three tiers. Seeing the curve tells us more than any single number.', S['small']))

    # ── Product one ─────────────────────────────────────────────────────
    s.append(PageBreak())
    s.append(Paragraph('PRODUCT ONE  ·  QUOTE THIS FIRST', S['eyebrow']))
    s.append(Paragraph('Empire Slide and Legacy Flip Flop', S['h1']))
    s.append(Paragraph(
        'One moulded family, four colourways each. This is the product we most want priced, because it '
        'needs no last development and the decoration is all surface work.',
        S['body']))
    s.append(Spacer(1, 6))
    s.append(sheet('throne-sandals.jpg'))
    s.append(Paragraph('Golden Throne — Legacy Flip Flop and Empire Slide, four colourways each', S['cap']))
    s.append(spec_table([
        ('Construction', 'Moulded rubber / EVA. Your existing sole family.'),
        ('Sizes', 'US 7–13 men’s. Tell us your standard run.'),
        ('Colourways', 'Royal Black Gold · Emerald Green Gold · Legacy Purple Gold · Ivory Gold. '
                       'Quote for four, and tell us the minimum per colourway.'),
        ('Upper', 'Slide: single strap, gold crest, gold piping to both edges. '
                  'Flip flop: toe post with a shield badge at the strap junction.'),
        ('Footbed', 'Embossed monogram texture across the bed, plus the line '
                    '“Lead the legacy. Leave a mark.” Debossed, not printed.'),
        ('Outsole', 'Our mark and a run number in the existing tread pattern if your tooling allows an '
                    'insert. If it does not, say so — we will drop it rather than cut a mould.'),
        ('Hardware', 'Embossed metal badge at the strap. Quote with and without: we want to see what the '
                     'metal part costs us.'),
        ('Packaging', 'Rigid black box, gold foil crest. Quote separately, or tell us your standard.'),
    ]))

    # ── Product two ─────────────────────────────────────────────────────
    s.append(PageBreak())
    s.append(Paragraph('PRODUCT TWO', S['eyebrow']))
    s.append(Paragraph('Golden Throne — Signature Edition', S['h1']))
    s.append(Paragraph(
        'A low trainer. Chosen from our range because it is the one whose character sits almost entirely '
        'in the upper. We have deliberately not asked you to price the models that need a sculpted heel.',
        S['body']))
    s.append(Spacer(1, 6))
    s.append(sheet('throne-signature.jpg'))
    s.append(Paragraph('Golden Throne — Signature Edition', S['cap']))
    s.append(spec_table([
        ('Construction', 'Cupsole or vulcanised, whichever you already tool. We are not specifying it.'),
        ('Sizes', 'US 7–13 men’s.'),
        ('Upper', 'Full-grain or premium synthetic leather, black. Metallic gold overlays at the swoop '
                  'panel, eyestay and heel tab.'),
        ('Decoration', 'Embroidered or heat-applied crest at the quarter. Gold foil wordmark at the '
                       'lateral panel. Script at the heel counter. All surface work.'),
        ('Wing panel', 'The emerald and purple wing on the medial side is a printed or embroidered panel, '
                       'not a moulded part. Please price it both ways.'),
        ('Midsole', 'Your standard unit. A visible air or gel window is wanted but <b>not</b> required — '
                    'tell us whether you have one already tooled, and quote without it if not.'),
        ('Insole', 'Printed crest and the line “Not given. Earned.”'),
        ('Lining', 'Tongue lining carries a printed message. Standard textile.'),
    ]))

    # ── Pipeline ────────────────────────────────────────────────────────
    s.append(PageBreak())
    s.append(Paragraph('NOT FOR QUOTATION — FOR CONTEXT', S['eyebrow']))
    s.append(Paragraph('What comes after, if the first run sells', S['h1']))
    s.append(Paragraph(
        'These models need real tooling: a sculpted lion-head heel counter, a bull-horn heel, custom air '
        'chambers. We know what that costs and we are not asking you to price it today. We are showing you '
        'because we would rather build a long relationship with one factory than shop each style around.',
        S['body']))
    s.append(Spacer(1, 6))
    s.append(sheet('throne-lionking-toro.jpg', width=4.6 * inch))
    s.append(Paragraph('Lion King GX and Toro Bravo — sculpted heel counters. Tooling required.', S['cap']))
    s.append(Paragraph(
        'If you have an existing heel-counter mould that could carry a raised emblem, we would be glad to '
        'hear about it. Adapting your tool beats cutting ours.',
        S['body']))

    # ── The ask ─────────────────────────────────────────────────────────
    s.append(PageBreak())
    s.append(Paragraph('WHAT WE NEED BACK', S['eyebrow']))
    s.append(Paragraph('Five answers, and a price', S['h1']))
    s.append(Spacer(1, 4))
    for n, (q_, why) in enumerate([
        ('What is your MOQ on tooling you already own — per style, and per colourway?',
         'This decides whether we can work together at all.'),
        ('What does a sample cost, how long does it take, and is it credited against the first order?',
         'We will pay for samples. We will not order production off a photograph.'),
        ('Looking at our designs, what is moulded and what is upper-only?',
         'You know your tooling. Tell us what to change to stay off a new mould.'),
        ('What are your payment terms, and what is inspected before the balance is due?',
         'We are a small company placing a first order. This answer matters more than your price.'),
        ('What is the lead time from approved sample to goods delivered to Missouri?',
         'Including shipping and customs, not ex-works.'),
    ], 1):
        s.append(KeepTogether([
            Paragraph(f'<b>{n}.  {q_}</b>', S['body']),
            Paragraph(f'&nbsp;&nbsp;&nbsp;&nbsp;{why}', S['small']),
        ]))
    s.append(Spacer(1, 12))
    s.append(rule())
    s.append(Spacer(1, 12))

    s.append(Paragraph('PRICE, PER PAIR, FOB OR DELIVERED — PLEASE STATE WHICH', S['eyebrow']))
    blank = Table([
        [Paragraph('<b>Style</b>', S['cellh']), Paragraph('<b>100 pairs</b>', S['cellh']),
         Paragraph('<b>300 pairs</b>', S['cellh']), Paragraph('<b>500 pairs</b>', S['cellh']),
         Paragraph('<b>Sample</b>', S['cellh'])],
        [Paragraph('Empire Slide', S['cell']), '', '', '', ''],
        [Paragraph('Legacy Flip Flop', S['cell']), '', '', '', ''],
        [Paragraph('Signature Edition', S['cell']), '', '', '', ''],
        [Paragraph('Packaging', S['cell']), '', '', '', ''],
    ], colWidths=[2.1 * inch, 1.2 * inch, 1.2 * inch, 1.2 * inch, 1.2 * inch], rowHeights=[0.32 * inch] + [0.42 * inch] * 4)
    blank.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, 0), PANEL),
        ('GRID', (0, 0), (-1, -1), 0.4, RULE),
    ]))
    s.append(blank)
    s.append(Spacer(1, 16))
    s.append(Paragraph(
        'Reply to <b>info@selfmadelegendsz.com</b>, or call <b>+1 (816) 466-3083</b>. If any part of this '
        'is unrealistic, tell us plainly — we would rather be corrected now than discover it after a '
        'deposit. Our design sheets are at <b>selfmadelegendsz.com/collection.html</b>.',
        S['body']))
    s.append(Spacer(1, 6))
    s.append(Paragraph(
        'All designs, marks and artwork in this document are the property of Self-Made Legends LLC and are '
        'shared for the purpose of quotation only.',
        S['small']))

    doc.build(s)
    size = os.path.getsize(OUT) / 1048576
    print(f'  OK  {OUT}  ({size:.1f} MB)')


if __name__ == '__main__':
    build()
