import React from "react";
import { render, screen } from "@testing-library/react";
import UsageMeter from "@/components/UsageMeter";

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
      React.createElement("div", props, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const freeUsage = {
  tier: "free",
  transcription_seconds_used: 1800,
  ai_tips_used: 10,
  limits: { transcription_seconds: 3600, ai_tips: 20 },
};

describe("UsageMeter", () => {
  test("renders for free tier users", () => {
    render(<UsageMeter usage={freeUsage} />);
    expect(screen.getByText("Free Tier Usage")).toBeInTheDocument();
  });

  test("does not render for pro tier users", () => {
    const { container } = render(
      <UsageMeter usage={{ ...freeUsage, tier: "pro" }} />
    );
    expect(container.firstChild).toBeNull();
  });

  test("does not render for studio tier users", () => {
    const { container } = render(
      <UsageMeter usage={{ ...freeUsage, tier: "studio" }} />
    );
    expect(container.firstChild).toBeNull();
  });

  test("shows correct transcription usage in minutes", () => {
    render(<UsageMeter usage={freeUsage} />);
    // 1800s = 30 min, limit = 60 min
    expect(screen.getByText("30 / 60 min")).toBeInTheDocument();
  });

  test("shows correct AI tips usage", () => {
    render(<UsageMeter usage={freeUsage} />);
    expect(screen.getByText("10 / 20")).toBeInTheDocument();
  });

  test("shows upgrade link", () => {
    render(<UsageMeter usage={freeUsage} />);
    expect(screen.getByText("Upgrade →")).toBeInTheDocument();
  });

  test("upgrade link points to /pricing", () => {
    render(<UsageMeter usage={freeUsage} />);
    const link = screen.getByText("Upgrade →").closest("a");
    expect(link).toHaveAttribute("href", "/pricing");
  });

  test("shows warning colour when transcription is over 80%", () => {
    const highUsage = { ...freeUsage, transcription_seconds_used: 3000 }; // 50min / 60min = 83%
    render(<UsageMeter usage={highUsage} />);
    const txLabel = screen.getByText("50 / 60 min");
    expect(txLabel).toHaveStyle({ color: "#f59e0b" });
  });

  test("shows normal colour when transcription is under 80%", () => {
    render(<UsageMeter usage={freeUsage} />); // 30/60 = 50%
    const txLabel = screen.getByText("30 / 60 min");
    expect(txLabel).not.toHaveStyle({ color: "#f59e0b" });
  });
});
