---
name: tdd-workflow
description: "Test-Driven Development workflow guidance. Explains RED-GREEN-REFACTOR cycle and best practices for TDD."
---

# TDD Workflow Guide

## The RED-GREEN-REFACTOR Cycle

### 1. RED Phase (Test First)

**Goal**: Write a failing test that defines expected behavior

```typescript
// Example: Testing a user service
describe('UserService', () => {
  it('should create user with valid email', async () => {
    const result = await userService.create({
      email: 'test@example.com',
      name: 'Test User'
    })

    expect(result.id).toBeDefined()
    expect(result.email).toBe('test@example.com')
  })

  it('should reject invalid email', async () => {
    await expect(
      userService.create({ email: 'invalid', name: 'Test' })
    ).rejects.toThrow('Invalid email')
  })
})
```

**Checklist**:
- [ ] Test describes ONE behavior
- [ ] Test fails for the RIGHT reason
- [ ] Test is isolated (no external dependencies)
- [ ] Error message is clear

### 2. GREEN Phase (Make It Pass)

**Goal**: Write minimal code to make tests pass

```typescript
// Minimal implementation
export class UserService {
  async create(data: CreateUserDto): Promise<User> {
    if (!this.isValidEmail(data.email)) {
      throw new Error('Invalid email')
    }

    return this.repository.save({
      id: generateId(),
      email: data.email,
      name: data.name
    })
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }
}
```

**Checklist**:
- [ ] All tests pass
- [ ] No unnecessary code
- [ ] No premature optimization
- [ ] Build succeeds

### 3. REFACTOR Phase (Improve)

**Goal**: Improve code quality while keeping tests green

**Safe Refactorings**:
- Extract method
- Rename for clarity
- Remove duplication
- Improve types

**Rules**:
- Run tests after EVERY change
- If tests fail, revert immediately
- Don't add new behavior (that needs new tests)

## TDD Anti-Patterns

### Test After (TAD)
Writing tests after implementation defeats the purpose. You end up testing implementation details instead of behavior.

### Test Everything
Not everything needs TDD. Skip for:
- Simple getters/setters
- Pure configuration
- Trivial mappings

### Slow Tests
Tests should run in milliseconds. Use:
- Mocks for external services
- In-memory databases for repos
- Focused test scope

## When to Use Each Test Type

| Scenario | Test Type | Agent |
|----------|-----------|-------|
| Business logic | Unit test | unit-test-writer |
| API contracts | Integration test | unit-test-writer |
| User flows | E2E test | e2e-test-writer |
| Visual regression | Snapshot test | unit-test-writer |

## TDD with oh-my-lord Workflow

1. **Planner** creates test specifications
2. **Executor** coordinates TDD cycle
3. **test-writer** agents write tests (RED)
4. **test-runner** verifies tests fail (RED)
5. **impl** agents write code (GREEN)
6. **test-runner** verifies tests pass (GREEN)
7. **Executor** coordinates refactoring (REFACTOR)
