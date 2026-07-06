import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useTranslation } from 'react-i18next'
import DatePicker from '../components/DatePicker'

describe('DatePicker', () => {
  it('renders with default value', async () => {
    const onChange = vi.fn()
    const { container } = render(<DatePicker value="2026-07-06" onChange={onChange} />)

    // Display input shows formatted date in zh format (YYYY/MM/DD)
    expect(await screen.findByDisplayValue('2026/07/06')).toBeInTheDocument()

    // Hidden date input has ISO value
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement
    expect(dateInput).toBeInTheDocument()
    expect(dateInput).toHaveValue('2026-07-06')
  })

  it('empty value renders empty', async () => {
    const onChange = vi.fn()
    render(<DatePicker value="" onChange={onChange} />)

    const textInput = screen.getByRole('textbox')
    expect(textInput).toHaveValue('')
  })

  it('user typing updates parent with zh format', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePicker value="" onChange={onChange} />)

    const textInput = screen.getByRole('textbox')
    await user.type(textInput, '2026/07/15')

    // onChange should have been called with ISO format
    expect(onChange).toHaveBeenCalledWith('2026-07-15')
  })

  it('user typing in English format also works', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePicker value="" onChange={onChange} />)

    const textInput = screen.getByRole('textbox')
    await user.type(textInput, '2026-07-15')

    expect(onChange).toHaveBeenCalledWith('2026-07-15')
  })

  it('blur re-formats display', async () => {
    const user = userEvent.setup()

    // Use a stateful wrapper so onChange updates the value prop
    function Wrapper() {
      const [value, setValue] = useState('')
      return <DatePicker value={value} onChange={setValue} />
    }
    render(<Wrapper />)

    const textInput = screen.getByRole('textbox')

    // Focus, type a non-padded date, then blur
    await user.type(textInput, '2026/7/5')
    await user.tab()

    // Display should be re-formatted with leading zeros
    await waitFor(() => {
      expect(textInput).toHaveValue('2026/07/05')
    })
  })

  it('Enter key blurs and reformats', async () => {
    const user = userEvent.setup()

    // Use a stateful wrapper so onChange updates the value prop
    function Wrapper() {
      const [value, setValue] = useState('')
      return <DatePicker value={value} onChange={setValue} />
    }
    const { container } = render(<Wrapper />)

    const textInput = screen.getByRole('textbox')
    await user.type(textInput, '2026/7/5{Enter}')

    // Display should be re-formatted with leading zeros
    await waitFor(() => {
      expect(textInput).toHaveValue('2026/07/05')
    })
  })

  it('min/max passed to hidden date input', () => {
    const onChange = vi.fn()
    const { container } = render(
      <DatePicker
        value="2026-07-06"
        onChange={onChange}
        min="2026-01-01"
        max="2026-12-31"
      />,
    )

    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement
    expect(dateInput).toHaveAttribute('min', '2026-01-01')
    expect(dateInput).toHaveAttribute('max', '2026-12-31')
  })

  it('renders in English format when i18n language is en', async () => {
    // Override the i18n mock to return English
    vi.mocked(useTranslation).mockImplementationOnce(() => ({
      t: (key: string) => key,
      i18n: { language: 'en', changeLanguage: vi.fn() },
    }))

    const onChange = vi.fn()
    render(<DatePicker value="2026-07-06" onChange={onChange} />)

    // English format uses YYYY-MM-DD — check the text input specifically
    const textInput = screen.getByRole('textbox')
    await waitFor(() => {
      expect(textInput).toHaveValue('2026-07-06')
    })
  })

  it('invalid date returns raw string', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePicker value="" onChange={onChange} />)

    const textInput = screen.getByRole('textbox')
    await user.type(textInput, 'invalid')

    // parseDisplayDate returns the raw string when it can't parse
    expect(onChange).toHaveBeenCalledWith('invalid')
  })

  it('showPicker fallback is safe when not available', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { container } = render(<DatePicker value="2026-07-06" onChange={onChange} />)

    // showPicker is not available in jsdom; clicking the container should not crash
    const outerDiv = container.firstChild as HTMLElement
    await user.click(outerDiv)

    // No crash means the test passes
    expect(true).toBe(true)
  })
})
