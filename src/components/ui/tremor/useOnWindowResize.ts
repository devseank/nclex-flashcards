// Vendored verbatim from Tremor Raw (https://tremor.so/docs/visualizations/bar-chart).
// Tremor useOnWindowResize [v0.0.2]
import * as React from "react";

export const useOnWindowResize = (handler: () => void) => {
  React.useEffect(() => {
    const handleResize = () => {
      handler();
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [handler]);
};
