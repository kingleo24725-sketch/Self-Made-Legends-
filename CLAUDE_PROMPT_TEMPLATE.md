# Claude Prompt Template for Self-Made Legends

Use this template when requesting code generation from Claude. Copy this template and fill in the bracketed sections.

## Template

```markdown
Claude, I need you to build [WHAT YOU NEED].

## Requirements

### Functional Requirements
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

### Design Requirements
- Use black (#1a1a1a), gold (#d4af37), and white (#ffffff) color scheme
- Maintain responsive mobile-first design
- Use Segoe UI font family
- Follow the SML brand identity for [product name]

### Technical Requirements
- [Technology/Framework to use]
- [Any libraries or dependencies]
- [Browser compatibility]
- [Performance requirements]

### Code Quality Requirements
- Write clean, readable code
- Include comments explaining key sections
- Avoid unnecessary complexity
- Follow [JavaScript/HTML/CSS] best practices
- Make code suitable for pasting directly into a feature branch

## Deliverables

I need:
1. Complete [HTML/JavaScript/CSS/other] code
2. A short explanation (2-3 sentences) of what the code does for the PR description
3. Any special instructions for integration (file locations, dependencies, etc.)

## Context

[Explain what this is for and why it's needed]

## Examples or Reference

[Link to similar code or provide examples of the desired output]

## Notes

- [Any special considerations]
- [Timeline or urgency]
- [Related features or dependencies]
```

## Real-World Examples

### Example 1: Requesting a New Page

```markdown
Claude, I need you to build the Founder Biography page for Self-Made Legends.

## Requirements

### Functional Requirements
- Display founder story (Jason Brown's journey)
- Include timeline of company milestones
- Show core values grid (Clarity, Compassion, Community, Excellence, Accessibility, Legacy)
- Include call-to-action button to quote form
- Add navigation links to other pages

### Design Requirements
- Use black (#1a1a1a), gold (#d4af37), and white (#ffffff)
- Maintain responsive design for mobile/tablet/desktop
- Use Segoe UI font family
- Include sticky navigation bar
- Footer with links to legal pages

### Technical Requirements
- Pure HTML/CSS (no frameworks)
- Mobile-responsive Grid/Flexbox
- Semantic HTML structure
- Must work in all modern browsers

### Code Quality
- Clean, readable code
- Comments explaining styling decisions
- No inline styles (use style tags)
- Proper indentation

## Deliverables

1. Complete HTML file (about-founder.html)
2. 2-3 sentence explanation for PR description
3. File path where to place it

## Context

This page is part of the Self-Made Legends website. It should tell the founder's story and inspire visitors to learn more about the company.

## References

See how-it-works.html and why-choose-us.html for design consistency.
```

### Example 2: Requesting a Feature

```markdown
Claude, I need you to build the AI Agent Bot conversation flow.

## Requirements

### Functional Requirements
- Collect 6 qualification questions in conversational format
  1. Age (number input, 40-100)
  2. Gender (choice: Male, Female, Prefer not to say)
  3. Smoking status (choice: Yes, No)
  4. Health conditions (choice: Yes, No)
  5. Coverage amount (choice: $5K-$25K)
  6. Contact info (name, phone, email)
- Animate message transitions
- Store responses in localStorage
- Output JSON format at end
- Include success screen with copy/restart buttons

### Design Requirements
- Black/gold/white theme
- Professional, trustworthy appearance
- Smooth animations
- Mobile-responsive
- Shows progress through conversation

### Technical Requirements
- Vanilla JavaScript (no frameworks)
- LocalStorage API
- Responsive CSS
- Browser compatibility: Chrome, Firefox, Safari, Edge

## Deliverables

1. agent-bot.html file
2. Explanation of the bot flow
3. How to embed it on other pages
4. How to connect it to the backend API

## Context

This bot is the primary customer intake mechanism. It needs to feel natural and supportive while gathering qualification data.
```

### Example 3: Requesting Backend Code

```markdown
Claude, I need you to build the backend API endpoint for storing leads.

## Requirements

### Functional Requirements
- POST endpoint at /api/submit-lead
- Accept lead data (age, gender, smoking, health, coverage, name, phone, email)
- Store in JSON files organized by date
- Generate daily summary report
- Return success/failure response

### Technical Requirements
- Node.js/Express.js
- JSON file storage (no database)
- CORS enabled
- Environment variable configuration
- Error handling

## Deliverables

1. Updated server.js with new endpoints
2. Explanation of data structure
3. Example cURL commands for testing
4. Instructions for integration

## Context

Leads come from both the quote form and AI Agent Bot. The system needs to store them reliably and generate daily reports for sales team review.
```

## Tips for Better Prompts

### 1. Be Specific
❌ "Build a form for our site"
✅ "Build a quote form with 8 fields (age, gender, smoking, etc.) that stores data in localStorage and submits to /api/submit-lead endpoint"

### 2. Include Design Details
❌ "Make it look professional"
✅ "Use black (#1a1a1a), gold (#d4af37), and white (#ffffff); responsive mobile-first design; Segoe UI font; similar styling to the why-choose-us.html page"

### 3. Provide Context
❌ "We need a page"
✅ "This page is the homepage for Self-Made Legends. It should introduce visitors to Final Expense insurance and encourage them to get a quote"

### 4. Specify Deliverables
❌ "Generate the code"
✅ "Provide: (1) complete HTML file, (2) 2-sentence explanation for PR description, (3) file path and naming"

### 5. Reference Examples
❌ "Make it consistent with the site"
✅ "Follow the same design pattern as homepage.html and product-page.html, which use sticky nav, gold accents, and card-based layouts"

## What Claude Will Provide

When you use this template, Claude will typically provide:

1. **Complete, production-ready code**
   - Properly formatted and indented
   - Comments on complex sections
   - Error handling included
   - No unnecessary complexity

2. **Short explanation**
   - What the code does (2-3 sentences)
   - Key features included
   - Ready to paste into PR description

3. **Integration instructions**
   - Where to place the file
   - What dependencies are needed
   - How to connect to other components
   - Any special setup required

## After Claude Provides Code

### Steps to Integration

1. **Create feature branch**
   ```bash
   git checkout -b feature/[name-of-feature]
   ```

2. **Paste code into correct file**
   - Follow the folder structure (frontend/, backend/, etc.)
   - Create new files or update existing ones

3. **Commit changes**
   ```bash
   git add .
   git commit -m "Add [feature name]"
   ```

4. **Push and open PR**
   ```bash
   git push origin feature/[name-of-feature]
   ```

5. **Use Claude's explanation in PR description**
   - Paste the 2-3 sentence explanation
   - Add "How to Review" section
   - Describe any testing done

## Common Prompts for SML

### Adding a New Page
```
Claude, I need you to build the [PAGE NAME] page for Self-Made Legends using HTML/CSS. 
Requirements: [list requirements]
Follow the design pattern of [EXISTING PAGE].
Use the SML color scheme (black/gold/white).
Make it mobile-responsive.
```

### Building an API Endpoint
```
Claude, I need you to build the [ENDPOINT NAME] API endpoint in Node.js/Express.
The endpoint should: [describe functionality]
Use JSON file storage (no database).
Return proper success/error responses.
Include error handling.
```

### Creating a Bot or Script
```
Claude, I need you to build the [BOT NAME] bot/script in JavaScript.
It should: [describe behavior]
Store data in localStorage.
Integrate with the API at [ENDPOINT].
Follow the SML brand styling.
```

### Refactoring Existing Code
```
Claude, I need you to refactor [DESCRIPTION OF CODE].
Make it: [cleaner, faster, more reusable, etc.]
Maintain the same functionality.
Improve readability.
Add helpful comments.
```

## Questions?

Refer to:
- `CONTRIBUTING.md` - Workflow and standards
- `PR_REVIEW_CHECKLIST.md` - What gets reviewed
- `DEPLOYMENT_GUIDE.md` - How to deploy
- Existing code in the repository for examples

Happy coding! 🏆
