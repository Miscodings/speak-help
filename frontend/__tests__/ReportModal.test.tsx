import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ReportModal, { Report } from "@/components/ReportModal";

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, initial, animate, exit, transition, ...props }: any) =>
      React.createElement("div", props, children),
    circle: ({ initial, animate, transition, strokeDasharray, strokeDashoffset, ...props }: any) =>
      React.createElement("circle", props),
    span: ({ children, initial, animate, transition, ...props }: any) =>
      React.createElement("span", props, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const sampleReport: Report = {
  score: 82,
  pacing: "Steady pace with good variation throughout.",
  fillers: "Used 'like' four times, mostly in the first half.",
  improvements: [
    "Pause more at the end of key sentences.",
    "Reduce use of filler word 'like'.",
    "Project more confidence in your opening.",
  ],
};

describe("ReportModal", () => {
  test("renders nothing when report is null", () => {
    const { container } = render(
      <ReportModal report={null} onClose={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  test("renders the score", () => {
    render(<ReportModal report={sampleReport} onClose={jest.fn()} />);
    expect(screen.getByText("82")).toBeInTheDocument();
  });

  test("renders the session report header", () => {
    render(<ReportModal report={sampleReport} onClose={jest.fn()} />);
    expect(screen.getByText("Session Report")).toBeInTheDocument();
  });

  test("renders pacing analysis", () => {
    render(<ReportModal report={sampleReport} onClose={jest.fn()} />);
    expect(screen.getByText(sampleReport.pacing)).toBeInTheDocument();
  });

  test("renders filler word analysis", () => {
    render(<ReportModal report={sampleReport} onClose={jest.fn()} />);
    expect(screen.getByText(sampleReport.fillers)).toBeInTheDocument();
  });

  test("renders all three improvement tips", () => {
    render(<ReportModal report={sampleReport} onClose={jest.fn()} />);
    sampleReport.improvements.forEach(tip => {
      expect(screen.getByText(tip)).toBeInTheDocument();
    });
  });

  test("calls onClose when close button is clicked", () => {
    const onClose = jest.fn();
    render(<ReportModal report={sampleReport} onClose={onClose} />);
    fireEvent.click(screen.getByText("✕"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("calls onClose when backdrop is clicked", () => {
    const onClose = jest.fn();
    const { container } = render(
      <ReportModal report={sampleReport} onClose={onClose} />
    );
    // Backdrop is the first div child of the outermost motion.div
    const backdrop = container.querySelector(".fixed.inset-0 div.absolute");
    if (backdrop) fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("shows positive label for high score", () => {
    render(<ReportModal report={{ ...sampleReport, score: 85 }} onClose={jest.fn()} />);
    expect(screen.getByText("Great session!")).toBeInTheDocument();
  });

  test("shows neutral label for mid score", () => {
    render(<ReportModal report={{ ...sampleReport, score: 65 }} onClose={jest.fn()} />);
    expect(screen.getByText("Solid effort.")).toBeInTheDocument();
  });

  test("shows growth label for low score", () => {
    render(<ReportModal report={{ ...sampleReport, score: 40 }} onClose={jest.fn()} />);
    expect(screen.getByText("Room to grow.")).toBeInTheDocument();
  });
});
