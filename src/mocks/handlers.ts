import { http, HttpResponse } from "msw";
import { encodeEnvelope, encodeEnvelopes } from "@connectrpc/connect/protocol";
import { trailerFlag } from "@connectrpc/connect/protocol-grpc-web";
import {
  SayRequest,
  SayResponse,
  IntroduceRequest,
  IntroduceResponse,
} from "../gen/proto/eliza_pb";

const sleep = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const shiftEnvelope = async (req: Request): Promise<Uint8Array> => {
  const buffer = await req.arrayBuffer();
  return new Uint8Array(buffer, 5, buffer.byteLength - 5);
};

export const handlers = [
  http.post(
    "http://localhost:50051/connectrpc.eliza.v1.ElizaService/Say",
    async ({ request }) => {
      const req = SayRequest.fromBinary(await shiftEnvelope(request));

      const res = new SayResponse({
        sentence: `${req.sentence} world, ${Date.now()}`,
      });
      const body = encodeEnvelopes(
        { flags: 0, data: res.toBinary() },
        { flags: trailerFlag, data: new Uint8Array(0) },
      );

      return HttpResponse.arrayBuffer(body, {
        headers: new Headers({
          "content-type": "application/grpc",
        }),
      });
    },
  ),
  http.post(
    "http://localhost:50051/connectrpc.eliza.v1.ElizaService/Introduce",
    async ({ request }) => {
      const req = IntroduceRequest.fromBinary(await shiftEnvelope(request));

      let abort = false;
      const stream = new ReadableStream({
        start: async (controller) => {
          while (!abort) {
            const res = new IntroduceResponse({
              sentence: `${req.name} hello ${Date.now()}`,
            });
            controller.enqueue(encodeEnvelope(0, res.toBinary()));
            await sleep(1000);
          }
          controller.enqueue(encodeEnvelope(trailerFlag, new Uint8Array(0)));
          controller.close();
        },
      });

      request.signal.addEventListener("abort", () => {
        abort = true;
      });

      return new HttpResponse(stream, {
        headers: new Headers({
          "content-type": "application/grpc",
        }),
      });
    },
  ),
];
