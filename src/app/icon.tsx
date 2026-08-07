import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "linear-gradient(145deg, #f4a348, #9e3f3f, #6e4364)",
        borderRadius: 9,
        color: "white",
        display: "flex",
        fontSize: 19,
        fontWeight: 700,
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      S
    </div>,
    size,
  );
}
