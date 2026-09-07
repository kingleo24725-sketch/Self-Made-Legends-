Drop Rose's original crest images here (the ones with the "Made with AI" badge), then run:

    python3 scripts/prep-images.py

Name them by where they go so the site picks them up automatically. Chosen mapping for the five crests:

    logo.png            full-color crest (lion face in the stone)  -> header logo + homepage
    bg-home.png         same full-color crest
    bg-services.png     warm crest with the lion face in the stone
    bg-community.png    crest with the owl in the stone
    bg-book.png         dark grey crest with gold highlights
    bg-careers.png      grey crest
    bg-about.png        full-color crest
    bg-shop.png         full-color crest
    bg-contact.png      grey crest

Full list of names the site looks for:

    logo.png            header logo (the color crest)
    bg-home.png         homepage hero background
    bg-book.png         booking page
    bg-community.png    community page
    bg-careers.png      careers page
    bg-services.png     all service pages
    bg-shop.png         shop
    bg-about.png        about
    bg-contact.png      contact

Any page without its own file falls back to the plain brown gradient.
This folder is ignored by git except this note; the prepared files land in public/img/.
