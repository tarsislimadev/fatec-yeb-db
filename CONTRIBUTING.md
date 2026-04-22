# Contributing to Phone List System

Thanks for your interest in contributing! This guide will help you understand the project structure and how to make contributions.

## Code of Conduct

- Be respectful and inclusive
- Report issues constructively
- Help others in the community

## Getting Started

1. **Fork & Clone**
```bash
git clone https://github.com/yourusername/fatec-yeb-db.git
cd fatec-yeb-db
```

2. **Setup Development Environment**
```bash
# Backend
cd backend
npm install
cp .env.example .env
npm run migrate
npm run seed

# Frontend (new terminal)
cd frontend
npm install
```

3. **Start Development Servers**
```bash
# Backend (terminal 1)
cd backend && npm run dev

# Frontend (terminal 2)
cd frontend && npm run dev
```

## Project Structure

### Backend (`backend/src/`)

```
src/
├── db/                 # Database layer
│   ├── index.js       # Connection pool & Redis
│   ├── schema.sql     # Database schema
│   ├── migrate.js     # Schema initialization
│   └── seed.js        # Test data
├── controllers/        # Request handlers
│   ├── authController.js
│   ├── phoneController.js
│   └── ownerController.js
├── middleware/         # Express middleware
│   └── index.js       # Auth, error handling
├── routes/             # Route definitions
│   ├── auth.js
│   └── phones.js
├── utils/              # Utility functions
│   ├── auth.js        # JWT, token management
│   ├── response.js    # Response formatting
│   └── phone.js       # Phone validation
├── __tests__/          # Integration tests
│   └── integration.test.js
└── server.js           # Express app setup
```

### Frontend (`frontend/src/`)

```
src/
├── components/         # Reusable UI components
│   ├── common.jsx     # Button, Input, Card, Alert
│   └── ProtectedRoute.jsx
├── pages/              # Page components
│   ├── LoginPage.jsx
│   ├── SignupPage.jsx
│   ├── PhonesPage.jsx
│   ├── PhoneDetailPage.jsx
│   ├── ForgotPasswordPage.jsx
│   └── LogoutPage.jsx
├── services/           # API client
│   └── api.js         # Axios wrapper + endpoints
├── store/              # State management
│   └── index.js       # Zustand stores
├── App.jsx             # Router setup
├── main.jsx            # Entry point
└── index.css           # Tailwind styles
```

## Development Workflow

### Making Changes

1. **Create a feature branch**
```bash
git checkout -b feature/your-feature-name
```

2. **Write code following the style guide** (see below)

3. **Test your changes**
```bash
# Backend
cd backend
npm test

# Frontend (manual for now)
# Test in browser at http://localhost:5173
```

4. **Commit with clear messages**
```bash
git commit -m "feat: add user profile page"
git commit -m "fix: handle 401 errors correctly"
git commit -m "docs: update API documentation"
```

5. **Push and create a Pull Request**
```bash
git push origin feature/your-feature-name
# Create PR on GitHub
```

### Commit Message Format

Follow conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (no logic change)
- `refactor`: Code restructuring
- `perf`: Performance improvement
- `test`: Tests
- `chore`: Maintenance

**Examples:**
```
feat(auth): add password reset email verification
fix(phones): handle duplicate phone numbers
docs: update API specification
test(controllers): add phoneController unit tests
```

## Code Style

### Backend (Node.js)

```javascript
// Use ES6 modules
import express from 'express';

// Use const for all declarations
const app = express();

// Arrow functions preferred
const handler = (req, res) => {
  // Code
};

// Use async/await
async function fetchPhones() {
  try {
    const phones = await db.query('SELECT * FROM phones');
    return phones;
  } catch (error) {
    console.error(error);
  }
}

// Use meaningful variable names
const userEmail = 'user@example.com';
const phoneNumber = '+5511999999999';

// Use template literals
const message = `User ${userEmail} created account`;
```

### Frontend (React)

```javascript
// Use functional components
export function MyComponent({ prop1, prop2 }) {
  const [state, setState] = useState(null);

  return (
    <div className="flex items-center">
      {state && <p>{state}</p>}
    </div>
  );
}

// Use hooks appropriately
useEffect(() => {
  loadData();
}, []);

// Use Tailwind classes
<button className="px-4 py-2 bg-blue-600 text-white rounded">
  Click me
</button>

// Use meaningful names
const [isLoading, setIsLoading] = useState(false);
const [errorMessage, setErrorMessage] = useState('');
```

### Linting

```bash
# Backend
cd backend
npm run lint

# Fix automatically
npx eslint src/ --fix
```

## Testing

### Backend Unit Tests

```javascript
// Example test structure
import { signup } from '../controllers/authController.js';

describe('authController.signup', () => {
  test('should create user with valid data', async () => {
    const req = { body: { email, password, display_name } };
    const res = { status: jest.fn(), json: jest.fn() };

    await signup(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('should reject duplicate email', async () => {
    // Test implementation
  });
});
```

### Backend Integration Tests

Use the examples in `backend/src/__tests__/integration.test.js`

### Frontend Testing

For now, test manually in the browser. Automated tests coming in Phase 2.

```bash
# Manual test checklist
- [ ] Login with test@example.com / Password123!
- [ ] Create a new phone number
- [ ] View phone details
- [ ] Update phone type
- [ ] Delete a phone
- [ ] Logout and login again
```

## Database Changes

### Adding a New Table

1. **Update schema.sql**
```sql
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- columns
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

2. **Run migration**
```bash
npm run migrate
```

3. **Update seed.js if needed**

### Modifying Existing Table

1. **Update schema.sql** (add ALTER statements if needed)
2. **Clear and remigrate** (for development only)
```bash
# Backup first!
npm run migrate
```

## API Changes

### Adding a New Endpoint

1. **Define in routes** (`backend/src/routes/`)
```javascript
router.post('/phones', authMiddleware, (req, res) => {
  // Handler
});
```

2. **Implement controller** (`backend/src/controllers/`)
```javascript
export async function createPhone(req, res) {
  // Implementation
}
```

3. **Document in api-spec.md**
```markdown
### POST /phones
Description and examples
```

4. **Add tests** (`backend/src/__tests__/`)

### Modifying Existing Endpoint

- Keep backward compatibility
- Update tests
- Update API documentation
- Add migration note if breaking change

## Documentation

### API Documentation

Update `docs/api-spec.md`:
```markdown
### POST /endpoint
**Description:** What it does

**Auth:** Requires token

**Request:**
\`\`\`json
{ "field": "value" }
\`\`\`

**Response (200):**
\`\`\`json
{ "data": {...}, "meta": {...} }
\`\`\`

**Errors:**
- 400: Invalid input
- 401: Unauthorized
```

### Code Comments

- Comment complex logic
- Explain WHY, not WHAT
```javascript
// Good: explains the why
const lockoutTime = 15 * 60 * 1000; // 15 min lockout after 5 failed attempts

// Bad: explains obvious what
const t = 900000; // time in milliseconds
```

### README Updates

Update relevant README files when:
- Adding dependencies
- Changing environment variables
- Adding new npm scripts

## Pull Request Process

1. **Update relevant docs**
2. **Add tests for new features**
3. **Ensure all tests pass**
```bash
npm test
npm run lint
```

4. **Create descriptive PR**
   - Title: `feat: short description`
   - Description: What, Why, How
   - Related issues: `Fixes #123`

5. **Respond to review feedback**

6. **Get approval and merge**

## Issue Reporting

### Bug Report

```markdown
**Description:**
Brief description of the bug

**Steps to Reproduce:**
1. Start backend
2. Login with test@example.com
3. Create a phone

**Expected Behavior:**
Phone should appear in list

**Actual Behavior:**
Page shows error

**Environment:**
- OS: Windows/Linux/Mac
- Node: v18.x.x
- Browser: Chrome/Firefox
```

### Feature Request

```markdown
**Description:**
What feature would you like to see?

**Use Case:**
Why would this be useful?

**Proposed Solution:**
How should it work?

**Alternatives:**
Other approaches considered
```

## Development Tips

### Debugging Backend

```javascript
// Add console logs
console.log('phoneId:', phoneId);
console.log('data:', JSON.stringify(data, null, 2));

// Use debugger in VSCode
// Add launch.json config:
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Backend",
      "program": "${workspaceFolder}/backend/src/server.js",
      "restart": true,
      "console": "integratedTerminal"
    }
  ]
}
```

### Debugging Frontend

- Open browser DevTools (F12)
- Use React DevTools extension
- Check Network tab for API calls
- Check Console for errors

### Hot Reload

Both backend (nodemon) and frontend (Vite) support hot reload:
```bash
cd backend && npm run dev  # Auto restarts on changes
cd frontend && npm run dev # Auto refresh on changes
```

## Resources

- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [React Best Practices](https://react.dev/learn)
- [Express Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Getting Help

- **Questions?** Open a discussion
- **Found a bug?** Open an issue
- **Need clarification?** Comment on the issue

## Review Criteria

PRs must:
- [ ] Follow code style guidelines
- [ ] Include tests for new features
- [ ] Update relevant documentation
- [ ] Pass all tests and linting
- [ ] Have clear commit messages
- [ ] Address all review feedback

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- GitHub contributors list
- Release notes for major contributions

Thank you for contributing! 🎉
