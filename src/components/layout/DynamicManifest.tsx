import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Replaces the static /manifest.json link with a dynamically built manifest
 * containing custom app icons stored in site_settings.
 */
export function DynamicManifest() {
  useEffect(() => {
    let manifestObjectUrl: string | null = null;

    const apply = async () => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("id, value")
          .in("id", [
            "app-icon-192",
            "app-icon-512",
            "app-icon-192-maskable",
            "app-icon-512-maskable",
            "app-icon-apple-180",
            "site-name",
          ]);
        if (error || !data) return;

        const map = Object.fromEntries(data.map((s: any) => [s.id, s.value])) as Record<string, string>;

        // If no custom icons, do nothing (keep static manifest)
        if (!map["app-icon-512"] && !map["app-icon-192"]) return;

        const siteName = map["site-name"] || "Спільнота B&C";

        const icons: Array<Record<string, any>> = [];
        if (map["app-icon-192"]) {
          icons.push({ src: map["app-icon-192"], sizes: "192x192", type: "image/png", purpose: "any" });
        }
        if (map["app-icon-512"]) {
          icons.push({ src: map["app-icon-512"], sizes: "512x512", type: "image/png", purpose: "any" });
        }
        if (map["app-icon-192-maskable"]) {
          icons.push({
            src: map["app-icon-192-maskable"],
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          });
        }
        if (map["app-icon-512-maskable"]) {
          icons.push({
            src: map["app-icon-512-maskable"],
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          });
        }

        const manifest = {
          name: siteName,
          short_name: siteName.length > 12 ? siteName.slice(0, 12) : siteName,
          id: "/",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          background_color: "#0b0b0b",
          theme_color: "#0b0b0b",
          icons,
        };

        const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
        manifestObjectUrl = URL.createObjectURL(blob);

        let link = document.querySelector("link[rel='manifest']") as HTMLLinkElement | null;
        if (!link) {
          link = document.createElement("link");
          link.rel = "manifest";
          document.head.appendChild(link);
        }
        link.href = manifestObjectUrl;

        // Apple touch icon override
        if (map["app-icon-apple-180"]) {
          let apple = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement | null;
          if (!apple) {
            apple = document.createElement("link");
            apple.rel = "apple-touch-icon";
            document.head.appendChild(apple);
          }
          apple.href = map["app-icon-apple-180"];
        }
      } catch (e) {
        console.warn("[DynamicManifest] failed:", e);
      }
    };

    apply();

    const onUpdate = () => {
      if (manifestObjectUrl) URL.revokeObjectURL(manifestObjectUrl);
      apply();
    };
    window.addEventListener("app-icon-updated", onUpdate);

    return () => {
      window.removeEventListener("app-icon-updated", onUpdate);
      if (manifestObjectUrl) URL.revokeObjectURL(manifestObjectUrl);
    };
  }, []);

  return null;
}