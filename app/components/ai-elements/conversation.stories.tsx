import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "./conversation";
import { Message, MessageContent } from "./message";
import { Response } from "./response";
import { MessagePart } from "./message-part";
import { Loader } from "./loader";

const meta = {
  title: "Components/Conversation",
  component: Conversation,
  tags: ["autodocs"],
} satisfies Meta<typeof Conversation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { children: null },
  render: function Render() {
    const status = "submitted";
    return (
      <Conversation>
        <ConversationContent>
          <Message from="assistant">
            <MessageContent>
              <Response>
                Hello! I&apos;m the AI assistant for the ElastoMania level
                editor. How can I help you today?
              </Response>
            </MessageContent>
          </Message>
          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {message.parts.map((part, i) => {
                  return (
                    <MessagePart
                      key={`${message.id}-${i}`}
                      part={part}
                      status={status}
                    />
                  );
                })}
              </MessageContent>
            </Message>
          ))}
          {status === "submitted" && <Loader />}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    );
  },
};

const messages = [
  {
    id: "1",
    role: "user",
    parts: [
      {
        type: "text",
        text: "Hi, can you help me create a new level?",
      },
    ],
  },
  {
    id: "2",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "Of course! What kind of level are you looking to create? Do you have any specific themes or challenges in mind?",
      },
    ],
  },
  {
    id: "3",
    role: "user",
    parts: [
      {
        type: "text",
        text: "I'm thinking of a jungle-themed level with lots of vines and trees.",
      },
    ],
  },
  {
    id: "4",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "That sounds like a fun idea! Jungle levels can be really engaging. Do you have any specific gameplay mechanics in mind?",
      },
    ],
  },
] as const;
