import type { Meta, StoryObj } from "@storybook/nextjs";
import AuthControls from "./AuthControls";

const meta = {
  title: "JoBrain/AuthControls",
  component: AuthControls,
  parameters: { layout: "centered" },
} satisfies Meta<typeof AuthControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
