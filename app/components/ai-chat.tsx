import { useRef, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  useEditorStore,
  useEditorStoreInstance,
  useEditorToolState,
  useEditorWidget,
} from "../editor/use-editor-store";
import type { AIWidget, AIToolState } from "../editor/widgets/ai-widget";
import {
  DefaultChatTransport,
  type UIDataTypes,
  type UIMessagePart,
  type UITools,
} from "ai";
import type { Polygon, Position } from "elmajs";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "./ai-elements/conversation";
import { Message, MessageContent } from "./ai-elements/message";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "./ai-elements/reasoning";
import { Response } from "./ai-elements/response";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputButton,
  PromptInputSubmit,
} from "./ai-elements/prompt-input";
import { toLeanLevelString } from "~/editor/lean-level";
import { Loader } from "./ai-elements/loader";
import { MessagePart } from "./ai-elements/message-part";
import { GlobeIcon } from "@phosphor-icons/react/dist/ssr";

export function AIChat() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [webSearch, setWebSearch] = useState(false);

  const store = useEditorStoreInstance();
  const aiToolState = useEditorToolState<AIToolState>("ai");
  const aiWidget = useEditorWidget<AIWidget>("ai");

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ai" }),
    onFinish: ({ message }) => {
      if (!aiWidget) {
        console.warn("AI tool not found in store");
        return;
      }

      for (const part of message.parts) {
        try {
          switch (part.type) {
            case "tool-add-apples":
              aiWidget.addApples([part.input as Position]);
              break;
            case "tool-add-killers":
              aiWidget.addKillers([part.input as Position]);
              break;
            case "tool-add-flowers":
              aiWidget.addFlowers([part.input as Position]);
              break;
            case "tool-add-polygons":
              aiWidget.addPolygons(
                (part.input as { polygons: Polygon[] }).polygons.map(
                  (polygon) => ({ ...polygon, grass: false })
                )
              );
              break;
            case "tool-move-start":
              aiWidget.moveStart(part.input as Position);
              break;
            case "tool-set-level-name":
              aiWidget.setLevelName((part.input as { name: string }).name);
              break;
            case "tool-fit-to-view":
              aiWidget.fitToView();
              break;
            default:
              console.error("Unknown tool type:", part.type);
          }
        } catch (error) {
          console.error("Error processing tool part:", part, error);
        }
      }
    },
    onError: (error: Error) => {
      console.error("Chat error:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    },
  });

  useEffect(
    function focusInput() {
      if (aiToolState?.isChatOpen && inputRef.current) {
        inputRef.current.focus();
      }
    },
    [aiToolState?.isChatOpen]
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = input.trim();
    if (!message) return;

    const levelContext = `Level: ${toLeanLevelString(store.getState())}`;
    const userMessage = `${message}\n\n${levelContext}`;

    sendMessage({ role: "user", parts: [{ type: "text", text: userMessage }] });
    setInput("");
  };

  if (!aiToolState?.isChatOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 overflow-clip w-96 h-96 max-h-[calc(100vh-2rem)] bg-gray-800 text-white border border-gray-700 rounded-[22px] shadow-lg flex flex-col z-50">
      <Conversation>
        <ConversationContent>
          {messages.length === 0 && (
            <Message from="assistant">
              <MessageContent>
                <Response>
                  Hello! I'm the AI assistant for the ElastoMania level editor.
                  How can I help you today?
                </Response>
              </MessageContent>
            </Message>
          )}
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

      <div className="p-2 pt-0">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            onChange={(e) => setInput(e.target.value)}
            value={input}
          />
          <PromptInputToolbar>
            <PromptInputTools>
              <PromptInputButton
                variant={webSearch ? "default" : "ghost"}
                onClick={() => setWebSearch(!webSearch)}
              >
                <GlobeIcon size={16} />
                <span>Search</span>
              </PromptInputButton>
            </PromptInputTools>
            <PromptInputSubmit disabled={!input} status={status} />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
}
