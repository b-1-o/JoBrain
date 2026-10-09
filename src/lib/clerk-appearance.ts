/**
 * Shared Clerk UI tokens, aligned with the application appearance system.
 * Keep one config shared between sign-in and sign-up.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: "var(--jb-user-accent, #ffffff)",
    colorBackground: "transparent",
    colorForeground: "var(--jb-auth-foreground, #f4f6f7)",
    colorBorder: "var(--jb-auth-border, rgba(255,255,255,0.12))",
    borderRadius: "18px",
  },
  options: {
    socialButtonsPlacement: "top",
    socialButtonsVariant: "blockButton",
    elevation: "raised",
  },
  elements: {
    card: "jb-clerk-card",
    headerTitle: "jb-clerk-title",
    headerSubtitle: "jb-clerk-subtitle",
    socialButtonsBlockButton: "jb-clerk-social",
    formFieldInput: "jb-clerk-input",
    formFieldLabel: "jb-clerk-label",
    formButtonPrimary: "jb-clerk-primary",
    footerActionLink: "jb-clerk-link",
    footerActionText: "jb-clerk-footer",
    dividerLine: "jb-clerk-divider-line",
    dividerText: "jb-clerk-divider-text",
  },
} as const;
