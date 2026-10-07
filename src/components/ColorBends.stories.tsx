import type { Meta, StoryObj } from "@storybook/nextjs";
import { ColorBends } from "./ColorBends";

const meta = {
  title: "Background/ColorBends",
  component: ColorBends,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ColorBends>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    color: "#ffffff",
    speed: 0.2,
    frequency: 1,
    noise: 0.15,
  },
  render: (args) => <div style={{ width: "100vw", height: "100vh" }}><ColorBends {...args} /></div>,
};
