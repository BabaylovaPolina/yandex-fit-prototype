import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AuthPage } from '../pages/AuthPage'

// ── Mock supabase ─────────────────────────────────────────────────────────────
const mockSignIn = vi.fn()
const mockSignUp = vi.fn()
const mockSignInWithOAuth = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignIn(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
    },
  },
}))

// ── Mock profile & exercises setup ────────────────────────────────────────────
const mockCreateProfile = vi.fn()
const mockSeedDefaultExercises = vi.fn()

vi.mock('../api/profile', () => ({
  createProfile: (...args: unknown[]) => mockCreateProfile(...args),
}))

vi.mock('../api/exercises', () => ({
  seedDefaultExercises: (...args: unknown[]) => mockSeedDefaultExercises(...args),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────
function fillForm(email: string, password: string) {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } })
  fireEvent.change(screen.getByLabelText(/пароль/i), { target: { value: password } })
}

// Точное совпадение "Войти" (не "Войти через Google")
function getSubmitButton() {
  return screen.getByRole('button', { name: /^войти$/i })
}

function getSignUpButton() {
  return screen.getByRole('button', { name: /создать аккаунт/i })
}

function switchToSignUp() {
  fireEvent.click(screen.getByText(/нет аккаунта/i))
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('AuthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('рендерит форму входа по умолчанию', () => {
    render(<AuthPage />)
    expect(screen.getByText('Вход для тренеров')).toBeInTheDocument()
    expect(getSubmitButton()).toBeInTheDocument()
  })

  it('переключается в режим регистрации', () => {
    render(<AuthPage />)
    switchToSignUp()
    expect(screen.getByText('Регистрация тренера')).toBeInTheDocument()
    expect(getSignUpButton()).toBeInTheDocument()
  })

  describe('Вход (sign-in)', () => {
    it('вызывает signInWithPassword с правильными данными', async () => {
      mockSignIn.mockResolvedValue({ error: null })
      render(<AuthPage />)

      fillForm('trainer@example.com', 'password123')
      fireEvent.click(getSubmitButton())

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          email: 'trainer@example.com',
          password: 'password123',
        })
      })
    })

    it('показывает ошибку при неверных данных', async () => {
      mockSignIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
      render(<AuthPage />)

      fillForm('wrong@example.com', 'wrongpassword')
      fireEvent.click(getSubmitButton())

      await waitFor(() => {
        expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
      })
    })

    it('не вызывает createProfile при входе', async () => {
      mockSignIn.mockResolvedValue({ error: null })
      render(<AuthPage />)

      fillForm('trainer@example.com', 'password123')
      fireEvent.click(getSubmitButton())

      await waitFor(() => expect(mockSignIn).toHaveBeenCalled())
      expect(mockCreateProfile).not.toHaveBeenCalled()
    })
  })

  describe('Регистрация (sign-up)', () => {
    const TEST_USER = { id: 'user-123', email: 'new@example.com', user_metadata: {} }

    it('вызывает signUp с правильными данными', async () => {
      mockSignUp.mockResolvedValue({ data: { user: TEST_USER }, error: null })
      mockCreateProfile.mockResolvedValue(undefined)
      mockSeedDefaultExercises.mockResolvedValue(undefined)

      render(<AuthPage />)
      switchToSignUp()
      fillForm('new@example.com', 'password123')
      fireEvent.click(getSignUpButton())

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'new@example.com',
          password: 'password123',
        })
      })
    })

    it('создаёт профиль после успешной регистрации', async () => {
      mockSignUp.mockResolvedValue({ data: { user: TEST_USER }, error: null })
      mockCreateProfile.mockResolvedValue(undefined)
      mockSeedDefaultExercises.mockResolvedValue(undefined)

      render(<AuthPage />)
      switchToSignUp()
      fillForm('new@example.com', 'password123')
      fireEvent.click(getSignUpButton())

      await waitFor(() => {
        expect(mockCreateProfile).toHaveBeenCalledWith('user-123', null)
      })
    })

    it('seeds упражнения после успешной регистрации', async () => {
      mockSignUp.mockResolvedValue({ data: { user: TEST_USER }, error: null })
      mockCreateProfile.mockResolvedValue(undefined)
      mockSeedDefaultExercises.mockResolvedValue(undefined)

      render(<AuthPage />)
      switchToSignUp()
      fillForm('new@example.com', 'password123')
      fireEvent.click(getSignUpButton())

      await waitFor(() => {
        expect(mockSeedDefaultExercises).toHaveBeenCalledWith('user-123')
      })
    })

    it('показывает ошибку при неудачной регистрации', async () => {
      mockSignUp.mockResolvedValue({ data: { user: null }, error: { message: 'User already registered' } })

      render(<AuthPage />)
      switchToSignUp()
      fillForm('existing@example.com', 'password123')
      fireEvent.click(getSignUpButton())

      await waitFor(() => {
        expect(screen.getByText('User already registered')).toBeInTheDocument()
      })
    })

    it('не блокирует регистрацию если createProfile упал', async () => {
      mockSignUp.mockResolvedValue({ data: { user: TEST_USER }, error: null })
      mockCreateProfile.mockRejectedValue(new Error('DB error'))
      mockSeedDefaultExercises.mockResolvedValue(undefined)

      render(<AuthPage />)
      switchToSignUp()
      fillForm('new@example.com', 'password123')
      fireEvent.click(getSignUpButton())

      await waitFor(() => expect(mockSignUp).toHaveBeenCalled())
      // Ошибка setupа не показывается пользователю
      expect(screen.queryByText(/db error/i)).not.toBeInTheDocument()
    })
  })

  describe('Google OAuth', () => {
    it('вызывает signInWithOAuth с google провайдером', async () => {
      mockSignInWithOAuth.mockResolvedValue({ error: null })
      render(<AuthPage />)

      fireEvent.click(screen.getByText(/войти через google/i))

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: expect.objectContaining({ redirectTo: expect.any(String) }),
        })
      })
    })

    it('показывает ошибку если OAuth упал', async () => {
      mockSignInWithOAuth.mockResolvedValue({ error: { message: 'OAuth error' } })
      render(<AuthPage />)

      fireEvent.click(screen.getByText(/войти через google/i))

      await waitFor(() => {
        expect(screen.getByText('OAuth error')).toBeInTheDocument()
      })
    })
  })
})
