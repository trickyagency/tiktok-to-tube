import * as React from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  from: Date | undefined;
  to: Date | undefined;
  onDateChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  className?: string;
}

const presets = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

export function DateRangePicker({ from, to, onDateChange, className }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handlePreset = (days: number) => {
    onDateChange({
      from: subDays(new Date(), days),
      to: new Date(),
    });
  };

  const handleThisMonth = () => {
    const now = new Date();
    onDateChange({
      from: startOfMonth(now),
      to: endOfMonth(now),
    });
  };

  const handleLastMonth = () => {
    const lastMonth = subMonths(new Date(), 1);
    onDateChange({
      from: startOfMonth(lastMonth),
      to: endOfMonth(lastMonth),
    });
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-[280px] justify-start text-left font-normal",
              !from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {from ? (
              to ? (
                <>
                  {format(from, "LLL dd, y")} - {format(to, "LLL dd, y")}
                </>
              ) : (
                format(from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div className="border-r p-2 space-y-1">
              <p className="text-xs font-medium text-muted-foreground mb-2 px-2">Presets</p>
              {presets.map((preset) => (
                <Button
                  key={preset.days}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => handlePreset(preset.days)}
                >
                  {preset.label}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={handleThisMonth}
              >
                This month
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={handleLastMonth}
              >
                Last month
              </Button>
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={from}
              selected={{ from, to }}
              onSelect={(range: DateRange | undefined) => {
                onDateChange({ from: range?.from, to: range?.to });
              }}
              numberOfMonths={2}
              className="p-3 pointer-events-auto"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
