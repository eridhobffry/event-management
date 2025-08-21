/// <reference types="vitest" />
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import CheckInClient from "@/components/organizer/CheckInClient";

// Helper UUID token that matches the component's regex
const TOKEN = "123e4567-e89b-12d3-a456-426614174000";

// Save and restore original fetch with typed global
type GlobalWithFetch = typeof globalThis & { fetch?: typeof fetch };
const g = globalThis as GlobalWithFetch;
const originalFetch = g.fetch;

describe("CheckInClient - manual token submission", () => {
  beforeEach(() => {
    // fresh fetch mock for each test
    g.fetch = vi.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    // restore original fetch (if any)
    g.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("submits token and shows success state", async () => {
    // Arrange fetch to return a successful toggle response
    (g.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        ticketId: "TCK-1",
        checkedIn: true,
        checkedInAt: "2024-01-01T10:00:00Z",
      }),
    });

    render(<CheckInClient />);

    // type a valid token
    const input = screen.getByPlaceholderText(
      /Paste token or https:\/\/your\.app\/api\/tickets\/check-in\?token=/i
    );
    fireEvent.change(input, { target: { value: TOKEN } });

    // token detected hint shows
    expect(await screen.findByText(/Detected token:/i)).toBeInTheDocument();
    expect(screen.getByText(TOKEN)).toBeInTheDocument();

    const button = screen.getByRole("button", { name: /Check in \/ Undo/i });
    expect(button).toBeEnabled();

    // Act: submit
    fireEvent.click(button);

    // Assert: fetch called with expected URL and method
    await waitFor(() => {
      expect(g.fetch).toHaveBeenCalledTimes(1);
    });
    const mockFetch = g.fetch as unknown as ReturnType<typeof vi.fn>;
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    const calledInit = mockFetch.mock.calls[0][1];
    expect(calledUrl).toContain("/api/tickets/check-in?token=");
    expect(calledUrl).toContain(encodeURIComponent(TOKEN));
    expect(calledInit?.method).toBe("POST");

    // Wait for loading to finish and result to render (assert on unique texts)
    await waitFor(() => {
      expect(screen.getByText(/TCK-1/)).toBeInTheDocument();
      expect(screen.getByText(/Checked in/i)).toBeInTheDocument();
    });
  });

  it("shows API error message on non-OK response", async () => {
    (g.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "Ticket not found" }),
    });

    render(<CheckInClient />);

    const input = screen.getByPlaceholderText(
      /Paste token or https:\/\/your\.app\/api\/tickets\/check-in\?token=/i
    );
    fireEvent.change(input, { target: { value: TOKEN } });

    const button = screen.getByRole("button", { name: /Check in \/ Undo/i });
    fireEvent.click(button);

    // Error message surfaced to user
    expect(await screen.findByText(/Ticket not found/i)).toBeInTheDocument();
  });

  it("disables submit when no token; Enter shows inline error and no network call", async () => {
    const mockFetch = g.fetch as unknown as ReturnType<typeof vi.fn>;

    render(<CheckInClient />);

    const input = screen.getByPlaceholderText(
      /Paste token or https:\/\/your\.app\/api\/tickets\/check-in\?token=/i
    );
    // Type an invalid string that doesn't contain UUID or token param
    fireEvent.change(input, { target: { value: "hello world" } });

    // Button is disabled when token not detected
    const button = screen.getByRole("button", { name: /Check in \/ Undo/i });
    expect(button).toBeDisabled();

    // Press Enter triggers handleSubmit via onKeyDown, which should set inline error
    fireEvent.keyDown(input, { key: "Enter" });

    expect(
      await screen.findByText(
        /No token found\. Paste token or QR link with \?token=/i
      )
    ).toBeInTheDocument();

    // Ensure no network call was attempted
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("parses token from full URL input and submits", async () => {
    // Mock success response
    (g.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        ticketId: "TCK-URL",
        checkedIn: false,
        checkedInAt: null,
      }),
    });

    render(<CheckInClient />);

    const input = screen.getByPlaceholderText(
      /Paste token or https:\/\/your\.app\/api\/tickets\/check-in\?token=/i
    );
    const fullUrl = `https://your.app/api/tickets/check-in?token=${encodeURIComponent(
      TOKEN
    )}`;
    fireEvent.change(input, { target: { value: fullUrl } });

    // The detected token should equal the UUID portion
    expect(await screen.findByText(/Detected token:/i)).toBeInTheDocument();
    expect(screen.getByText(TOKEN)).toBeInTheDocument();

    const button = screen.getByRole("button", { name: /Check in \/ Undo/i });
    expect(button).toBeEnabled();
    fireEvent.click(button);

    // Ensure request uses extracted token
    await waitFor(() => {
      expect(g.fetch).toHaveBeenCalledTimes(1);
    });
    const mockFetch = g.fetch as unknown as ReturnType<typeof vi.fn>;
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    const calledInit = mockFetch.mock.calls[0][1];
    expect(calledUrl).toContain("/api/tickets/check-in?token=");
    expect(calledUrl).toContain(encodeURIComponent(TOKEN));
    expect(calledInit?.method).toBe("POST");

    // UI shows ticket result (Issued state)
    await waitFor(() => {
      expect(screen.getByText(/TCK-URL/)).toBeInTheDocument();
      expect(screen.getByText(/Issued/i)).toBeInTheDocument();
    });
  });

  it("submits on Enter key when token is present", async () => {
    (g.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, ticketId: "TCK-ENTER", checkedIn: true, checkedInAt: "2024-01-01T10:00:00Z" }),
    });

    render(<CheckInClient />);

    const input = screen.getByPlaceholderText(
      /Paste token or https:\/\/your\.app\/api\/tickets\/check-in\?token=/i
    );
    fireEvent.change(input, { target: { value: TOKEN } });

    // Press Enter to submit
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(g.fetch).toHaveBeenCalledTimes(1);
    });
    const mockFetch = g.fetch as unknown as ReturnType<typeof vi.fn>;
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain(encodeURIComponent(TOKEN));

    // Shows result
    await waitFor(() => {
      expect(screen.getByText(/TCK-ENTER/)).toBeInTheDocument();
      expect(screen.getByText(/Checked in/i)).toBeInTheDocument();
    });
  });

  it("shows generic Request failed message when API returns non-JSON error", async () => {
    (g.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("boom");
      },
    });

    render(<CheckInClient />);

    const input = screen.getByPlaceholderText(
      /Paste token or https:\/\/your\.app\/api\/tickets\/check-in\?token=/i
    );
    fireEvent.change(input, { target: { value: TOKEN } });

    const button = screen.getByRole("button", { name: /Check in \/ Undo/i });
    fireEvent.click(button);

    expect(
      await screen.findByText(/Request failed \(500\)/i)
    ).toBeInTheDocument();
  });
});
