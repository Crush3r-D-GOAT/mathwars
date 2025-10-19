import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function LineGraph({ yValues }) {
  const points = yValues.map((y, index) => ({ x: index + 1, y }));

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <LineChart
          data={points}
          margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="x"
            label={{ value: "Game", position: "insideBottom", offset: -5 }}
          />
          <YAxis label={{ value: "Score", angle: -90, position: "insideLeft" }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="y"
            stroke="#8884d8"
            strokeWidth={3}
            dot={{ r: 5 }}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
