import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Treemap
} from 'recharts';
import { 
  ChartBarIcon, 
  ChartPieIcon, 
  PresentationChartLineIcon,
  Squares2X2Icon,
  CogIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '../Icons';

const InteractiveChart = ({
  data = [],
  title = '',
  type = 'line',
  height = 400,
  showLegend = true,
  showGrid = true,
  showTooltip = true,
  colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'],
  xAxisKey = 'x',
  yAxisKeys = ['y'],
  customTooltip = null,
  animations = true,
  responsive = true,
  allowTypeChange = true,
  allowFullscreen = false,
  onDataPointClick = null,
  formatters = {}
}) => {
  const [currentType, setCurrentType] = useState(type);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const [highlightedSeries, setHighlightedSeries] = useState(null);

  // Chart type options
  const chartTypes = [
    { value: 'line', label: 'Line Chart', icon: PresentationChartLineIcon },
    { value: 'area', label: 'Area Chart', icon: PresentationChartLineIcon },
    { value: 'bar', label: 'Bar Chart', icon: ChartBarIcon },
    { value: 'pie', label: 'Pie Chart', icon: ChartPieIcon },
    { value: 'composed', label: 'Combined Chart', icon: Squares2X2Icon },
    { value: 'scatter', label: 'Scatter Plot', icon: Squares2X2Icon },
    { value: 'radar', label: 'Radar Chart', icon: Squares2X2Icon }
  ];

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    
    if (customTooltip) {
      return customTooltip({ active, payload, label });
    }

    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center text-sm">
            <div 
              className="w-3 h-3 rounded-full mr-2" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.name}:</span>
            <span className="ml-1 font-medium">
              {formatters[entry.dataKey] 
                ? formatters[entry.dataKey](entry.value)
                : entry.value?.toLocaleString ? entry.value.toLocaleString() : entry.value
              }
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Handle data point clicks
  const handleDataClick = (data, event) => {
    setSelectedData(data);
    if (onDataPointClick) {
      onDataPointClick(data, event);
    }
  };

  // Legend mouse events
  const handleLegendMouseEnter = (entry) => {
    setHighlightedSeries(entry.dataKey);
  };

  const handleLegendMouseLeave = () => {
    setHighlightedSeries(null);
  };

  // Custom legend component
  const CustomLegend = (props) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center mt-4 gap-4">
        {payload.map((entry, index) => (
          <div 
            key={index}
            className={`flex items-center cursor-pointer transition-opacity ${
              highlightedSeries && highlightedSeries !== entry.dataKey ? 'opacity-50' : 'opacity-100'
            }`}
            onMouseEnter={() => handleLegendMouseEnter(entry)}
            onMouseLeave={handleLegendMouseLeave}
          >
            <div 
              className="w-3 h-3 rounded-full mr-2" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-700">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  // Render different chart types
  const renderChart = () => {
    const commonProps = {
      data,
      onClick: handleDataClick,
    };

    const commonAxisProps = {
      tick: { fontSize: 12 },
      axisLine: { stroke: '#E5E7EB' },
      tickLine: { stroke: '#E5E7EB' }
    };

    switch (currentType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />}
            <XAxis dataKey={xAxisKey} {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend content={<CustomLegend />} />}
            {yAxisKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.3}
                strokeWidth={2}
                animationDuration={animations ? 1500 : 0}
              />
            ))}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />}
            <XAxis dataKey={xAxisKey} {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend content={<CustomLegend />} />}
            {yAxisKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
                radius={[2, 2, 0, 0]}
                animationDuration={animations ? 1000 : 0}
              />
            ))}
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
              outerRadius={Math.min(height * 0.3, 150)}
              fill="#8884d8"
              dataKey={yAxisKeys[0]}
              animationDuration={animations ? 1000 : 0}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={colors[index % colors.length]}
                  onClick={() => handleDataClick(entry)}
                  style={{ cursor: onDataPointClick ? 'pointer' : 'default' }}
                />
              ))}
            </Pie>
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend content={<CustomLegend />} />}
          </PieChart>
        );

      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />}
            <XAxis dataKey={xAxisKey} {...commonAxisProps} />
            <YAxis yAxisId="left" {...commonAxisProps} />
            <YAxis yAxisId="right" orientation="right" {...commonAxisProps} />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend content={<CustomLegend />} />}
            {yAxisKeys.map((key, index) => {
              if (index === 0) {
                return (
                  <Area
                    key={key}
                    yAxisId="left"
                    type="monotone"
                    dataKey={key}
                    fill={colors[index % colors.length]}
                    fillOpacity={0.3}
                    stroke={colors[index % colors.length]}
                  />
                );
              } else if (index === 1) {
                return (
                  <Bar
                    key={key}
                    yAxisId="right"
                    dataKey={key}
                    fill={colors[index % colors.length]}
                  />
                );
              } else {
                return (
                  <Line
                    key={key}
                    yAxisId="right"
                    type="monotone"
                    dataKey={key}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                  />
                );
              }
            })}
          </ComposedChart>
        );

      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />}
            <XAxis type="number" dataKey={xAxisKey} {...commonAxisProps} />
            <YAxis type="number" dataKey={yAxisKeys[0]} {...commonAxisProps} />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            <Scatter 
              name="Data Points" 
              dataKey={yAxisKeys[1] || yAxisKeys[0]} 
              fill={colors[0]}
            />
          </ScatterChart>
        );

      case 'radar':
        return (
          <RadarChart cx="50%" cy="50%" outerRadius="80%" {...commonProps}>
            <PolarGrid />
            <PolarAngleAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
            <PolarRadiusAxis />
            {yAxisKeys.map((key, index) => (
              <Radar
                key={key}
                name={key}
                dataKey={key}
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.3}
              />
            ))}
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend content={<CustomLegend />} />}
          </RadarChart>
        );

      default: // line
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />}
            <XAxis dataKey={xAxisKey} {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend content={<CustomLegend />} />}
            {yAxisKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ fill: colors[index % colors.length], strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: colors[index % colors.length], strokeWidth: 2 }}
                animationDuration={animations ? 1500 : 0}
              />
            ))}
          </LineChart>
        );
    }
  };

  const chartContainer = (
    <div className={`bg-white shadow rounded-lg ${isFullscreen ? 'fixed inset-0 z-50 p-6' : 'p-6'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <div className="flex items-center space-x-2">
          {allowTypeChange && (
            <select
              value={currentType}
              onChange={(e) => setCurrentType(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {chartTypes.map(chartType => (
                <option key={chartType.value} value={chartType.value}>
                  {chartType.label}
                </option>
              ))}
            </select>
          )}
          {allowFullscreen && (
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <ArrowsPointingInIcon className="h-4 w-4" />
              ) : (
                <ArrowsPointingOutIcon className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>
      
      <div style={{ height: isFullscreen ? 'calc(100vh - 120px)' : height }}>
        {responsive ? (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        ) : (
          renderChart()
        )}
      </div>
      
      {selectedData && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900">Selected Data Point:</p>
          <p className="text-sm text-blue-800">
            {JSON.stringify(selectedData, null, 2).replace(/[{}",]/g, '').trim()}
          </p>
        </div>
      )}
    </div>
  );

  return chartContainer;
};

// Predefined chart configurations for common use cases
export const ChartPresets = {
  // Revenue chart preset
  revenue: {
    type: 'area',
    colors: ['#10B981', '#3B82F6'],
    formatters: {
      revenue: (value) => `$${value?.toLocaleString()}`,
      profit: (value) => `$${value?.toLocaleString()}`
    }
  },
  
  // Case metrics preset
  cases: {
    type: 'bar',
    colors: ['#3B82F6', '#F59E0B', '#EF4444'],
    formatters: {
      opened: (value) => `${value} cases`,
      closed: (value) => `${value} cases`,
      pending: (value) => `${value} cases`
    }
  },
  
  // Performance metrics preset
  performance: {
    type: 'radar',
    colors: ['#8B5CF6', '#06B6D4'],
    showGrid: true
  },
  
  // Time series preset
  timeSeries: {
    type: 'line',
    colors: ['#3B82F6', '#10B981', '#F59E0B'],
    showGrid: true,
    animations: true
  }
};

export default InteractiveChart;