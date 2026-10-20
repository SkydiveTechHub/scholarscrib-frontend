export type SseFrame = { event: string; data: string };

function parseFrame(raw: string): SseFrame | null {
  let event = "message";
  const data: string[] = [];
  for (const line of raw.split("\n")) {
    if (!line || line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value;
    else if (field === "data") data.push(value);
  }
  return data.length === 0 ? null : { event, data: data.join("\n") };
}

/**
 * Incremental parser: feed it decoded text in whatever pieces the network
 * delivers; it returns each complete frame exactly once. A frame is complete
 * at its blank line, so a half-received frame waits in the buffer.
 */
export function createSseParser() {
  let buffer = "";
  return {
    push(chunk: string): SseFrame[] {
      // Normalised on the whole buffer, so a CRLF split across two chunks
      // still collapses once both halves are here.
      buffer = (buffer + chunk).replace(/\r\n/g, "\n");
      const frames: SseFrame[] = [];
      let end: number;
      while ((end = buffer.indexOf("\n\n")) !== -1) {
        const frame = parseFrame(buffer.slice(0, end));
        buffer = buffer.slice(end + 2);
        if (frame) frames.push(frame);
      }
      return frames;
    },
  };
}
