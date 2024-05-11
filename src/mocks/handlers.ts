import { http, HttpResponse, delay } from "msw";
import {
  pipeTo,
  sinkAll,
  transformSplitEnvelope,
  encodeEnvelope,
  encodeEnvelopes,
} from "@connectrpc/connect/protocol";
import { trailerFlag } from "@connectrpc/connect/protocol-grpc-web";
import {
  SayRequest,
  SayResponse,
  IntroduceRequest,
  IntroduceResponse,
} from "../gen/proto/eliza_pb";

const shiftEnvelope = async (req: Request): Promise<Uint8Array> => {
  async function* createIt() {
    const ary = new Uint8Array(await req.arrayBuffer());
    yield ary;
  }

  const messages = await pipeTo(
    createIt(),
    transformSplitEnvelope(0xffffffff),
    sinkAll(),
  );
  return messages[0].data;
};

export const handlers = [
  http.post(
    "http://localhost:8080/connectrpc.eliza.v1.ElizaService/SayMock",
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
    "http://localhost:8080/connectrpc.eliza.v1.ElizaService/IntroduceMock",
    async ({ request }) => {
      const req = IntroduceRequest.fromBinary(await shiftEnvelope(request));

      const stream = new ReadableStream({
        start: async (controller) => {
          while (!request.signal.aborted) {
            const res = new IntroduceResponse({
              sentence: `${req.name} hello ${Date.now()}`,
            });
            controller.enqueue(encodeEnvelope(0, res.toBinary()));
            await delay(1000);
          }
          controller.enqueue(encodeEnvelope(trailerFlag, new Uint8Array(0)));
          controller.close();
        },
      });

      return new HttpResponse(stream, {
        headers: new Headers({
          "content-type": "application/grpc",
        }),
      });
    },
  ),
];
