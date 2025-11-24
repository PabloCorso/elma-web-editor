import type { ChatStatus, UIDataTypes, UIMessagePart, UITools } from "ai";
import { Response } from "./response";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "./reasoning";

export function MessagePart({
  part,
  status,
}: {
  part: UIMessagePart<UIDataTypes, UITools>;
  status: ChatStatus;
}) {
  switch (part.type) {
    case "text":
      return <Response>{part.text}</Response>;
    case "reasoning":
      return (
        <Reasoning
          className="w-full"
          isStreaming={status === "streaming"}
          canExpand={part.text.length > 0}
        >
          <ReasoningTrigger />
          <ReasoningContent>{part.text}</ReasoningContent>
        </Reasoning>
      );
    case "source-url":
      return <div>Source: {part.url}</div>;
    case "tool-add-apples":
      return <div>Added apple</div>;
    case "tool-add-killers":
      return <div>Added killer</div>;
    case "tool-add-flowers":
      return <div>Added flower</div>;
    case "tool-add-polygons":
      return <div>Added polygon</div>;
    case "tool-move-start":
      return <div>Set start</div>;
    case "tool-set-level-name":
      return <div>Set level name</div>;
    case "tool-fit-to-view":
      return <div>Fit to view</div>;
    default:
      return null;
  }
}
