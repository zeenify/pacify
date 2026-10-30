/* P5Image — replica of the react-native-web <Image> rendering model.
   RNW does NOT render an <img> for display: the user styles (size, transform,
   clip-path, opacity, transition) go on a root view, and the bitmap is painted
   as a CSS background-image on an inner absolute-fill layer with
   background-position: center and background-size derived from resizeMode.
   A plain <img> would subtly change geometry (centered background vs
   object-position, clip/transform spaces), so screens that ported RN <Image>
   use this instead. */
import type { CSSProperties } from "react";

export function P5Image({
  src,
  resizeMode = "cover",
  style,
  className,
}: {
  src: string;
  resizeMode?: "contain" | "cover";
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div className={`v ${className ?? ""}`} style={{ overflow: "hidden", zIndex: 0, ...style }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "transparent",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          backgroundSize: resizeMode === "contain" ? "contain" : "cover",
          backgroundImage: `url("${src}")`,
          zIndex: -1,
        }}
      />
    </div>
  );
}
