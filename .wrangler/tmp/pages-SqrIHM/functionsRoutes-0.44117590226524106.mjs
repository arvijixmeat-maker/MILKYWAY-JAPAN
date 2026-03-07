import { onRequest as __api___route___ts_onRequest } from "C:\\Users\\agape\\OneDrive\\바탕 화면\\japan platform\\functions\\api\\[[route]].ts"
import { onRequestGet as __sitemap_xml_ts_onRequestGet } from "C:\\Users\\agape\\OneDrive\\바탕 화면\\japan platform\\functions\\sitemap.xml.ts"
import { onRequestGet as ____path___ts_onRequestGet } from "C:\\Users\\agape\\OneDrive\\바탕 화면\\japan platform\\functions\\[[path]].ts"

export const routes = [
    {
      routePath: "/api/:route*",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api___route___ts_onRequest],
    },
  {
      routePath: "/sitemap.xml",
      mountPath: "/",
      method: "GET",
      middlewares: [],
      modules: [__sitemap_xml_ts_onRequestGet],
    },
  {
      routePath: "/:path*",
      mountPath: "/",
      method: "GET",
      middlewares: [],
      modules: [____path___ts_onRequestGet],
    },
  ]