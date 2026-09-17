# Self-Made Legends Life & Legacy Insurance Co.

A modern, Black-owned digital insurance platform dedicated to making Final Expense insurance simple, accessible, and affordable for families.

## 🎯 Project Overview

Self-Made Legends is building a new standard for life insurance—one focused on **clarity**, **compassion**, and **community**. Our platform helps families protect what matters most without the confusion and bureaucracy of traditional insurance.

### Key Features

- ✅ **Simple Online Process** - No offices to visit, no paperwork to mail
- ✅ **Fast Approvals** - Most applications approved within days, not weeks
- ✅ **No Medical Exams** - Just honest answers to straightforward questions
- ✅ **AI-Assisted Experience** - Intelligent assistant explains everything in plain language
- ✅ **Secure & Private** - Your data is encrypted and never sold
- ✅ **Community Focused** - Built for Black families and communities

## 📁 Repository Structure

```
Self-Made-Legends-/
├── frontend/                    # Website and customer-facing code
│   ├── index.html             # Homepage
│   ├── product-page.html      # Final Expense product details
│   ├── underwriting-form.html # Quote form
│   ├── agent-bot.html         # AI Agent Bot
│   ├── faq.html               # FAQ
│   ├── contact.html           # Contact form
│   ├── partner-with-us.html   # Partnership page
│   └── ...other pages
│
├── backend/                     # Server and API logic
│   ├── server.js              # Express.js server
│   ├── lead-submitter.js      # Lead submission utility
│   └── ...other backend files
│
├── ai-bots/                     # AI bot system
│   ├── motherboard.js         # Central rules engine
│   ├── bots-framework.js      # Bot base classes
│   ├── agent-bot.js           # Qualification bot
│   ├── underwriting-bot.js    # Risk assessment bot
│   └── ...other bots
│
├── docs/                        # Documentation
│   ├── partnership-scripts.md # Outreach scripts
│   ├── email-templates.md     # Email templates
│   └── images/                # Assets
│
├── .github/workflows/           # CI/CD automation
│   └── code-quality.yml       # Automated quality checks
│
├── CONTRIBUTING.md            # Branch naming & workflow
├── PR_REVIEW_CHECKLIST.md     # Review guidelines
├── CLAUDE_PROMPT_TEMPLATE.md  # Feature request template
├── DEPLOYMENT_GUIDE.md        # Deployment instructions
├── BACKEND_README.md          # API documentation
├── package.json
├── server.js
└── README.md                  # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/kingleo24725-sketch/Self-Made-Legends-.git
   cd Self-Made-Legends-
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```
   Server runs at `http://localhost:3000`

4. **Open in browser**
   - Homepage: `http://localhost:3000/index.html`
   - Quote Form: `http://localhost:3000/underwriting-form.html`
   - AI Bot: `http://localhost:3000/agent-bot.html`

## 📝 Development Workflow

### Creating Features

1. **Create a feature branch**
   ```bash
   git checkout -b feature/name-of-feature
   ```

2. **Request code from Claude** (see `CLAUDE_PROMPT_TEMPLATE.md`)

3. **Integrate and commit**
   ```bash
   git add .
   git commit -m "Add [feature name]"
   git push origin feature/name-of-feature
   ```

4. **Open pull request** and use `PR_REVIEW_CHECKLIST.md`

5. **Merge to main** once approved

See `CONTRIBUTING.md` for complete workflow.

## 📚 Key Documentation

| Document | Purpose |
|----------|---------|
| `CONTRIBUTING.md` | Branch naming, workflow |
| `PR_REVIEW_CHECKLIST.md` | Code review standards |
| `CLAUDE_PROMPT_TEMPLATE.md` | How to request features |
| `DEPLOYMENT_GUIDE.md` | Deployment instructions |
| `BACKEND_README.md` | API documentation |

## 🤖 AI Bot System

Advanced bot architecture with Motherboard (central rules engine) and specialized bots for underwriting, claims, fraud detection, and compliance.

See `ai-bots/` folder and `BACKEND_README.md` for details.

## 📊 API Endpoints

```bash
POST   /api/submit-lead        # Submit quote/application
GET    /api/daily-summary      # Daily summary
GET    /api/leads/all          # All leads
GET    /api/leads/count        # Lead count
GET    /api/status             # Server status
```

See `BACKEND_README.md` for complete documentation.

## 🎨 Brand Identity

- **Colors**: Black #1a1a1a, Gold #d4af37, White #ffffff
- **Font**: Segoe UI, sans-serif
- **Design**: Clean, professional, responsive

## 🔒 Security

- Never commit secrets or API keys
- Use environment variables
- Validate all user input
- HTTPS for all connections
- No sensitive data exposure

## 📱 Responsive Design

All pages tested on desktop, tablet, and mobile.

## ✅ Testing

- Manual testing on all pages
- Automated GitHub Actions checks
- Quote form submission verification
- API endpoint validation

## 🚀 Deployment

**Frontend** (Vercel/Netlify): Push to `main` for automatic deployment

**Backend** (Railway/Render): Push to `main` for automatic deployment

See `DEPLOYMENT_GUIDE.md` for detailed instructions.

## 📞 Support

- Read `CONTRIBUTING.md` for workflow questions
- Check `PR_REVIEW_CHECKLIST.md` for code standards
- See `DEPLOYMENT_GUIDE.md` for deployment help
- Review GitHub Issues for known problems

## 🏆 Self-Made Legends Values

- **Clarity**: Plain language, no jargon
- **Compassion**: Understanding customer needs
- **Community**: Serving overlooked families
- **Excellence**: Never compromise on quality
- **Accessibility**: Insurance for everyone
- **Legacy**: Building generational wealth

---

**Built with ❤️ for Black families by Self-Made Legends**

[Get Started](frontend/underwriting-form.html) | [Learn More](frontend/about-founder.html) | [Contact Us](frontend/contact.html)
