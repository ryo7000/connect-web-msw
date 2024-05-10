import { http, HttpResponse } from "msw";
import { encodeEnvelopes } from "@connectrpc/connect/protocol";
import { trailerFlag } from "@connectrpc/connect/protocol-grpc-web";
import { SayRequest, SayResponse } from "../gen/proto/eliza_pb";

const shiftEnvelope = async (req: Request): Promise<Uint8Array> => {
  const buffer = await req.arrayBuffer();
  return new Uint8Array(buffer, 5, buffer.byteLength - 5);
};

export const handlers = [
  http.post(
    "http://localhost:50051/connectrpc.eliza.v1.ElizaService/Say",
    async ({ request }) => {
      const req = SayRequest.fromBinary(await shiftEnvelope(request));

      const res = new SayResponse({ sentence: `${req.sentence} world` });
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
];
