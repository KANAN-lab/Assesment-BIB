declare module 'jspdf' {
  export class jsPDF {
    constructor(...args: any[]);
    [key: string]: any;
  }
  export default jsPDF;
}

declare module 'recharts' {
  const recharts: any;
  export default recharts;
  export const ResponsiveContainer: any;
  export const BarChart: any;
  export const Bar: any;
  export const XAxis: any;
  export const YAxis: any;
  export const Tooltip: any;
  export const Legend: any;
  export const CartesianGrid: any;
  export const PieChart: any;
  export const Pie: any;
  export const Cell: any;
  export const RadarChart: any;
  export const Radar: any;
  export const PolarGrid: any;
  export const PolarAngleAxis: any;
  export const PolarRadiusAxis: any;
  export const LineChart: any;
  export const Line: any;
  export const AreaChart: any;
  export const Area: any;
}

declare module '@google/generative-ai';
