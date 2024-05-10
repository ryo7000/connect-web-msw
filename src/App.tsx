import { useState, useRef } from "react";
import { createPromiseClient, ConnectError, Code } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";
import { ElizaService } from "./gen/proto/eliza_connect";
import { SayRequest } from "./gen/proto/eliza_pb";
import "./App.css";

function App() {
  const [sayRes, setSayRes] = useState<string>();
  const [introduceRes, setIntroduceRes] = useState<string[]>([]);
  const cancelRef = useRef<AbortController | null>(null);

  const client = createPromiseClient(
    ElizaService,
    createGrpcWebTransport({ baseUrl: "http://localhost:50051" }),
  );

  const onClickSay = async () => {
    const res = await client.say({ sentence: "hello" });
    setSayRes(res.sentence);
  };

  const onClickIntroduce = async () => {
    onClickAbort();
    cancelRef.current = new AbortController();

    try {
      for await (const res of client.introduce(
        { name: "foobar" },
        { signal: cancelRef.current.signal },
      )) {
        setIntroduceRes((prev) => [res.sentence, ...prev]);
      }
    } catch (e) {
      const err = ConnectError.from(e);
      if (err.code === Code.Canceled) {
        console.log("cancel stream");
      }
    }
  };

  const onClickAbort = () => {
    cancelRef.current?.abort();
    setIntroduceRes([]);
  };

  return (
    <div style={{ display: "flex" }}>
      <div>
        <button type="button" onClick={onClickSay}>
          Say
        </button>
        <div style={{ width: "400px" }}>{sayRes}</div>
      </div>
      <div>
        <button type="button" onClick={onClickIntroduce}>
          Introduce
        </button>
        <button type="button" onClick={onClickAbort}>
          Cancel
        </button>
        <div style={{ width: "400px", height: "100px", overflow: "auto" }}>
          {introduceRes.map((s, i) => (
            <div key={i}>{s}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
