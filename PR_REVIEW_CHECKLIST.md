# Pull Request Review Checklist

This checklist ensures every pull request meets our standards before merging into `main`. Use this for self-review and peer review.

## Before You Submit Your PR

- [ ] Code runs without errors
- [ ] Feature works as intended (tested locally)
- [ ] No sensitive data is exposed (API keys, passwords, etc.)
- [ ] Follows SML brand styling (black/gold/white theme)
- [ ] Commit history is clean and descriptive
- [ ] PR description is clear and complete
- [ ] All files are organized in correct folders
- [ ] No merge conflicts with main branch

## PR Description Template

Use this template for your pull request description:

```markdown
## Description
[Brief description of what this PR does]

## Why This Change Was Needed
[Explain the problem being solved or feature being added]

## Changes Included
- [Change 1]
- [Change 2]
- [Change 3]

## How to Review
1. [Step 1 for reviewer]
2. [Step 2 for reviewer]
3. [Step 3 for reviewer]

## Testing
[Describe how you tested this change]

## Screenshots (if applicable)
[Add screenshots or videos showing the change]

## Related Issues
Closes #[issue number]
```

## Code Quality Checklist

### Functionality
- [ ] Code solves the stated problem
- [ ] Feature works in all browsers (Chrome, Firefox, Safari, Edge)
- [ ] Works on mobile devices (responsive design)
- [ ] No console errors or warnings
- [ ] No breaking changes to existing features

### Code Style
- [ ] Follows JavaScript/HTML/CSS conventions
- [ ] Uses meaningful variable and function names
- [ ] No unnecessary complexity
- [ ] Comments explain complex logic
- [ ] Proper indentation and formatting

### Performance
- [ ] No memory leaks
- [ ] No infinite loops
- [ ] Reasonable file sizes
- [ ] Optimized images and assets
- [ ] Efficient database queries (if applicable)

### Security
- [ ] No hardcoded secrets or API keys
- [ ] No SQL injection vulnerabilities
- [ ] No XSS (cross-site scripting) vulnerabilities
- [ ] Properly validates user input
- [ ] Uses HTTPS for external requests
- [ ] No sensitive data in logs or comments

### Documentation
- [ ] Code comments explain the "why"
- [ ] Complex functions have documentation
- [ ] Updated README if necessary
- [ ] Updated CONTRIBUTING.md if necessary
- [ ] Commit messages are clear and descriptive

### Brand & Design
- [ ] Uses SML color scheme (black #1a1a1a, gold #d4af37, white #ffffff)
- [ ] Consistent with existing design system
- [ ] Professional appearance
- [ ] Proper typography (Segoe UI, consistent sizes)
- [ ] Responsive on all screen sizes

### File Organization
- [ ] Files are in correct directories (frontend/, backend/, ai-bots/, etc.)
- [ ] No unnecessary files committed
- [ ] .gitignore properly configured
- [ ] No node_modules or build artifacts committed

### Git Hygiene
- [ ] Branch name follows convention (feature/, fix/, infra/)
- [ ] Commit messages are clear and descriptive
- [ ] No merge commits in feature branch (use rebase if needed)
- [ ] No unnecessary commits (clean history)
- [ ] Branch is up to date with main

## Peer Review Checklist

### As a Code Reviewer

- [ ] I understand what this PR does
- [ ] The approach makes sense
- [ ] Code quality is acceptable
- [ ] No security issues
- [ ] No breaking changes
- [ ] Documentation is adequate
- [ ] Tests pass (if applicable)
- [ ] PR description is clear

### Questions to Ask
- Does this solve the problem?
- Is there a simpler way to do this?
- Are there edge cases not handled?
- Is error handling adequate?
- Is performance acceptable?
- Are there security concerns?

## Merge Checklist

Before clicking "Merge":

- [ ] All GitHub checks pass (CI/CD pipeline)
- [ ] At least one peer review approval
- [ ] No merge conflicts
- [ ] Branch is up to date with main
- [ ] PR description explains changes clearly
- [ ] All conversations are resolved

## After Merge

- [ ] Delete the feature branch
- [ ] Close related issues
- [ ] Monitor production for issues
- [ ] Update release notes if applicable
- [ ] Celebrate! 🎉

## Common Issues to Catch

### During Self-Review

- ❌ `console.log()` statements left in code
- ❌ Commented-out code (delete it or explain why it's needed)
- ❌ `TODO` comments without context
- ❌ Inconsistent variable naming
- ❌ Unused imports or variables
- ❌ Magic numbers without explanation
- ❌ Hard-coded values that should be configurable

### During Peer Review

- ❌ Unclear variable names
- ❌ Missing error handling
- ❌ Inadequate comments for complex logic
- ❌ Inconsistent style with rest of codebase
- ❌ Potential performance issues
- ❌ Security vulnerabilities
- ❌ Breaking changes without documentation

## Review Example

### Good PR Description

```markdown
## Description
Add AI Agent Bot to quote form integration

## Why This Change Was Needed
Customers need an interactive way to get quotes. The AI Agent Bot provides a conversational experience that feels natural and helps customers understand their coverage options.

## Changes Included
- Added agent-bot.html with 6-question flow
- Integrated bot with quote form backend
- Added localStorage fallback for offline mode
- Updated homepage to embed bot
- Added bot styling to match SML brand

## How to Review
1. Open homepage and verify bot loads in iframe
2. Go through the bot conversation (answer all 6 questions)
3. Verify data is captured in the API response
4. Check localStorage to confirm offline storage works
5. Review code for sensitive data exposure
6. Confirm styling matches black/gold/white theme

## Testing
- Tested in Chrome, Firefox, Safari
- Tested on mobile (iPhone, Android)
- Verified form submission to API
- Checked localStorage persistence
- Tested offline mode

## Related Issues
Closes #42
```

## Tips for Better Code Reviews

1. **Be constructive** - Focus on the code, not the person
2. **Ask questions** - Help reviewers understand your thinking
3. **Provide context** - Explain why changes were made
4. **Be specific** - Point to exact lines if issues exist
5. **Praise good work** - Acknowledge clean code and smart solutions
6. **Suggest improvements** - Not just problems, but better ways

## Questions?

Refer to:
- `CONTRIBUTING.md` - Development workflow
- `DEPLOYMENT_GUIDE.md` - How to deploy changes
- `CLAUDE_PROMPT_TEMPLATE.md` - How to request features from Claude
- GitHub Issues - For specific bugs or questions

Thank you for maintaining code quality! 🏆
