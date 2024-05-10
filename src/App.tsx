import { useState } from "react";
import { createPromiseClient } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";
import { ElizaService } from "./gen/proto/eliza_connect";
import { SayRequest } from "./gen/proto/eliza_pb";
import "./App.css";

function App() {
  const [sayRes, setSayRes] = useState<string>();
  const [introduceRes, setIntroduceRes] = useState<string[]>([]);

  const client = createPromiseClient(
    ElizaService,
    createGrpcWebTransport({ baseUrl: "http://localhost:50051" }),
  );

  const onClickSay = async () => {
    const res = await client.say({ sentence: "hello" });
    setSayRes(res.sentence);
  };

  const onClickIntroduce = async () => {
    for await (const res of client.introduce({ name: "foobar" })) {
      setIntroduceRes((prev) => [res.sentence, ...prev]);
    }
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
