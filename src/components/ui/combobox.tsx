
"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "./scroll-area"

type Option = {
  value: string
  label: string
  key?: string
}

type ComboboxProps = {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  noResultsMessage?: string
  disabled?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  noResultsMessage = "No results found.",
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  const handleSelect = (currentValue: string) => {
    onChange(currentValue.toLowerCase() === value.toLowerCase() ? "" : currentValue)
    setOpen(false)
  }

  const handleCreate = () => {
    if (inputValue && !options.some(opt => opt.value.toLowerCase() === inputValue.toLowerCase())) {
      onChange(inputValue);
    }
    setOpen(false);
  }

  const filteredOptions = inputValue
    ? options.filter(option =>
        option.label.toLowerCase().includes(inputValue.toLowerCase())
      )
    : options;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {value
            ? options.find((option) => option.value.toLowerCase() === value.toLowerCase())?.label
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={searchPlaceholder} 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <ScrollArea className="h-auto max-h-[200px] overflow-y-auto">
              {filteredOptions.length === 0 && inputValue ? (
                <CommandEmpty>
                    <Button variant="ghost" className="w-full" onClick={handleCreate}>
                        Create "{inputValue}"
                    </Button>
                </CommandEmpty>
              ) : <CommandEmpty>{noResultsMessage}</CommandEmpty>
              }
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.key ?? option.value}
                    value={option.value}
                    onSelect={handleSelect}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value.toLowerCase() === option.value.toLowerCase() ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
