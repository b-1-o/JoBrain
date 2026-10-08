import { SignUp } from "@clerk/nextjs";
import PatternWaves from "@components/PatternWaves";

const appearance = {
  variables: {
    colorPrimary: "#ffffff",
    colorBackground: "rgba(10, 11, 13, 0.72)",
    colorForeground: "#f4f6f7",
    colorBorder: "rgba(255,255,255,0.12)",
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

export default function SignUpPage() {
  return (
    <main className="jb-auth-page">
      <PatternWaves
        preset="silk"
        color="#ffffff"
        backgroundColor="#050607"
        fade="edges"
        interactive={false}
        shine={0.65}
        contrast={1.05}
        speed={0.18}
        opacity={0.48}
        className="jb-auth-pattern"
      />
      <div className="jb-auth-noise" />
      <div className="jb-auth-shell">
        <a className="jb-auth-brand" href="/">
          <span className="jb-brand-mark">JB</span>
          <span>JOBRAIN</span>
        </a>
        <SignUp appearance={appearance} />
      </div>
    </main>
  );
}
