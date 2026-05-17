import type { UserMsg } from "../types";

export function UserMessage({ msg }: { msg: UserMsg }) {
  return (
    <div className="msg msg-user">
      <div className="msg-body">
        <div className="msg-text">{msg.text}</div>
      </div>
    </div>
  );
}
