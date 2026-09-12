# Contributing to Self-Made Legends

Thank you for contributing to Self-Made Legends Life & Legacy Insurance Co. This guide ensures our repository stays organized, professional, and production-ready.

## Branch Naming Convention

We use a consistent branch naming system to keep the repository organized and easy to navigate.

### Branch Types

#### 1. Feature Branches
Create a new feature branch for every new feature, page, or functionality.

**Format:** `feature/name-of-feature`

**Examples:**
- `feature/final-expense-product-page`
- `feature/quote-form`
- `feature/ai-agent-bot`
- `feature/backend-json-storage`
- `feature/carrier-partnership-page`
- `feature/mobile-responsive-design`
- `feature/dashboard-analytics`

**How to create:**
```bash
git checkout -b feature/name-of-feature
# Make your changes
git add .
git commit -m "Add [feature name]"
git push origin feature/name-of-feature
```

#### 2. Bug Fix Branches
Create a bug fix branch whenever you're fixing an issue or bug.

**Format:** `fix/name-of-fix`

**Examples:**
- `fix/bot-not-loading`
- `fix/form-validation-error`
- `fix/styling-mobile-view`
- `fix/api-endpoint-response`
- `fix/quote-form-submission`

**How to create:**
```bash
git checkout -b fix/name-of-fix
# Make your fixes
git add .
git commit -m "Fix [issue name]"
git push origin fix/name-of-fix
```

#### 3. Infrastructure Branches
Create an infrastructure branch for DevOps, deployment, CI/CD, or configuration changes.

**Format:** `infra/name-of-task`

**Examples:**
- `infra/github-workflows`
- `infra/deployment-setup`
- `infra/database-migration`
- `infra/env-configuration`
- `infra/docker-setup`

**How to create:**
```bash
git checkout -b infra/name-of-task
# Make infrastructure changes
git add .
git commit -m "Infrastructure: [description]"
git push origin infra/name-of-task
```

### Main Branch

The `main` branch is your **production-ready** code. It must always be clean, tested, and stable.

**Rules for main:**
- ✅ Never commit directly to main
- ✅ All code must be reviewed via pull request
- ✅ All tests and checks must pass
- ✅ Code must follow SML brand styling
- ✅ No sensitive data should be exposed

## Development Workflow

### Step-by-Step Process

1. **Create your feature branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes and commit**
   ```bash
   git add .
   git commit -m "Add [description of change]"
   ```

3. **Push to remote**
   ```bash
   git push -u origin feature/your-feature-name
   ```

4. **Open a Pull Request**
   - Go to GitHub and open a pull request
   - Use the PR template (see PR_REVIEW_CHECKLIST.md)
   - Reference related issues if applicable
   - Provide a clear description of changes

5. **Code Review**
   - Self-review your code first
   - Address any feedback from reviewers
   - Ensure all checks pass

6. **Merge to Main**
   - Once approved, merge your branch into main
   - Delete the feature branch after merging
   - Deploy if necessary

## Commit Message Guidelines

Write clear, descriptive commit messages that explain what changed and why.

### Format
```
[Type]: [Brief description]

[Optional: More detailed explanation]
```

### Types
- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation only
- `style:` Changes that don't affect code meaning (formatting, etc.)
- `refactor:` Code change that doesn't add features or fix bugs
- `perf:` Improve performance
- `test:` Add or update tests
- `chore:` Changes to build process or dependencies

### Examples
```
feat: Add AI Agent Bot to quote form

fix: Resolve form validation error on mobile

docs: Update deployment guide

refactor: Simplify lead storage logic

chore: Update dependencies
```

## Code Standards

### JavaScript/Node.js
- Use `const` by default, `let` when necessary
- Use meaningful variable names
- Comment complex logic
- Follow ESLint rules (if configured)

### HTML/CSS
- Follow SML black/gold/white color scheme
- Maintain responsive mobile-first design
- Use semantic HTML
- Comment key CSS sections

### JSON
- Maintain consistent 2-space indentation
- Keep structure organized
- Document complex nested objects

## Sensitive Data

**Never commit:**
- API keys or secrets
- Database passwords
- Authentication tokens
- Private email addresses
- Credit card information
- Customer personal data

Use environment variables for secrets:
```bash
# .env (never commit this file)
DATABASE_URL=your_url
API_KEY=your_key
```

## Code Review Process

See `PR_REVIEW_CHECKLIST.md` for the complete code review checklist.

### Before submitting a PR, ensure:
1. ✅ Code runs without errors
2. ✅ Feature works as intended
3. ✅ No sensitive data is exposed
4. ✅ Follows SML brand styling
5. ✅ Commit history is clean
6. ✅ PR description is clear

## Questions?

If you have questions about the contributing process, please:
- Check the documentation in the `docs/` folder
- Review existing pull requests for examples
- Ask in the project issues or discussions

Thank you for helping build Self-Made Legends! 🏆
