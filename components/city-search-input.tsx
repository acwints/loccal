"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface CityResult {
  display: string;
  city: string;
  region: string;
  country: string;
}

interface CitySearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function CitySearchInput({ value, onChange, placeholder }: CitySearchInputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [results, setResults] = useState<CityResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listboxId = useRef(`city-listbox-${Math.random().toString(36).slice(2, 8)}`).current;

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const fetchCities = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/loccal/city-search?q=${encodeURIComponent(query.trim())}`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        setResults([]);
        setIsOpen(false);
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      const items = data.results as CityResult[];
      setResults(items);
      setIsOpen(items.length > 0 || query.trim().length >= 2);
      setActiveIndex(-1);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setResults([]);
      setIsOpen(false);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  function handleInputChange(newValue: string) {
    setInputValue(newValue);
    onChange(newValue);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCities(newValue), 500);
  }

  function selectCity(city: CityResult) {
    setInputValue(city.display);
    onChange(city.display);
    setIsOpen(false);
    setResults([]);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (!isOpen) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (event.key === "Enter" && activeIndex >= 0 && results[activeIndex]) {
      event.preventDefault();
      selectCity(results[activeIndex]);
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  function handleBlur() {
    blurTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      setActiveIndex(-1);
    }, 150);
  }

  function handleFocus() {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    if (results.length > 0) setIsOpen(true);
  }

  function handleOptionMouseDown() {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      abortRef.current?.abort();
    };
  }, []);

  return (
    <div className="city-search-wrap">
      <input
        className="settings-input"
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
        aria-autocomplete="list"
        placeholder={placeholder ?? "Search for a city\u2026"}
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={handleFocus}
      />

      {isLoading && <span className="city-search-spinner" aria-label="Loading" />}

      {isOpen && (
        <ul id={listboxId} className="city-search-dropdown" role="listbox">
          {results.length === 0 ? (
            <li className="city-search-empty">No cities found</li>
          ) : (
            results.map((city, index) => (
              <li
                key={city.display}
                id={`${listboxId}-opt-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={`city-search-option${index === activeIndex ? " city-search-option-active" : ""}`}
                onMouseDown={handleOptionMouseDown}
                onClick={() => selectCity(city)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                {city.display}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
