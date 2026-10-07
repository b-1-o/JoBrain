import type { Meta, StoryObj } from "@storybook/nextjs";
import WorkflowTools from "./WorkflowTools";

const meta = {
  title: "Workflow/WorkflowTools",
  component: WorkflowTools,
} satisfies Meta<typeof WorkflowTools>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div style={{ padding: 24, background: "#111", minHeight: 220 }}>
      <WorkflowTools />
    </div>
  ),
};
