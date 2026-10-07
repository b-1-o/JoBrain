import type { Meta, StoryObj } from "@storybook/nextjs";
import { DotField } from "./DotField";

const meta = {
  title: "Background/DotField",
  component: DotField,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof DotField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  args: {
    dotRadius: 1.5,
    dotSpacing: 14,
    cursorRadius: 500,
    cursorForce: 0.1,
    bulgeOnly: true,
    bulgeStrength: 67,
    glowRadius: 160,
    sparkle: false,
    waveAmplitude: 0,
  },
  render: (args) => <div style={{ width: "100vw", height: "100vh" }}><DotField {...args} /></div>,
};
