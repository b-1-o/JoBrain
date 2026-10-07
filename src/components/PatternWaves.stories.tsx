import type { Meta, StoryObj } from "@storybook/nextjs";
import PatternWaves from "./PatternWaves";

const meta = {
  title: "Background/PatternWaves",
  component: PatternWaves,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PatternWaves>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Dark: Story = {
  args: {
    preset: "silk",
    color: "#ffffff",
    backgroundColor: "#050607",
    fade: "edges",
    interactive: true,
    cursorSize: 50,
    cursorStrength: 0.6,
    shine: 0.15,
  },
  render: (args) => <div style={{ width: "100vw", height: "100vh" }}><PatternWaves {...args} /></div>,
};

export const Light: Story = {
  args: {
    preset: "silk",
    color: "#000000",
    backgroundColor: "#dfdfdf",
    fade: "edges",
    interactive: true,
    cursorSize: 50,
    cursorStrength: 0.6,
    markSize: 1,
    shine: 0.75,
  },
  render: (args) => <div style={{ width: "100vw", height: "100vh" }}><PatternWaves {...args} /></div>,
};
