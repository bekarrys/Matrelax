import React from 'react';
import { DatePicker, parseDate } from '@ark-ui/react/date-picker';
import { Portal } from '@ark-ui/react/portal';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import './DatePickerField.css';

/**
 * DatePickerField — попап-календарь на Ark UI, в теме Premium Dark.
 * Drop-in замена нативных <input type="date"|"month">.
 *
 * Props:
 *   value    — 'YYYY-MM-DD' (mode="day") или 'YYYY-MM' (mode="month"); '' = пусто
 *   onChange — (nextValue: string) => void  (тот же формат, что value)
 *   mode     — 'day' | 'month'  (default 'day')
 *   placeholder, className
 */
const RU_MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function displayLabel(value, mode, placeholder) {
  if (!value) return placeholder || (mode === 'month' ? 'Месяц' : 'дд.мм.гггг');
  if (mode === 'month') {
    const [y, m] = value.split('-');
    return `${RU_MONTHS[Number(m) - 1]} ${y}`;
  }
  const [y, m, d] = value.split('-');
  return `${d}.${m}.${y}`;
}

function ViewControl() {
  return (
    <DatePicker.ViewControl className="dpf-viewctl">
      <DatePicker.PrevTrigger className="dpf-navbtn" aria-label="Назад"><ChevronLeft /></DatePicker.PrevTrigger>
      <DatePicker.ViewTrigger className="dpf-viewtrigger"><DatePicker.RangeText /></DatePicker.ViewTrigger>
      <DatePicker.NextTrigger className="dpf-navbtn" aria-label="Вперёд"><ChevronRight /></DatePicker.NextTrigger>
    </DatePicker.ViewControl>
  );
}

export default function DatePickerField({ value, onChange, mode = 'day', placeholder, className = '' }) {
  const isMonth = mode === 'month';
  const iso = isMonth && value ? `${value}-01` : value;
  const arkValue = iso ? [parseDate(iso)] : [];

  const handleChange = (details) => {
    // value[0] — DateValue; .toString() даёт ISO 'YYYY-MM-DD' независимо от locale.
    // (details.valueAsString локализован под ru → 'дд.мм.гггг', парсить нельзя.)
    const dv = details.value?.[0];
    if (!dv) return onChange('');
    const iso = dv.toString();
    onChange(isMonth ? iso.slice(0, 7) : iso);
  };

  return (
    <DatePicker.Root
      className={`dpf ${className}`}
      value={arkValue}
      onValueChange={handleChange}
      locale="ru"
      timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
      startOfWeek={1}
      closeOnSelect
      defaultView={isMonth ? 'month' : 'day'}
      minView={isMonth ? 'month' : 'day'}
      maxView="year"
    >
      <DatePicker.Control className="dpf-control">
        <DatePicker.Trigger className="dpf-trigger">
          <Calendar className="dpf-cal-icon" />
          <span className="dpf-trigger-text">{displayLabel(value, mode, placeholder)}</span>
        </DatePicker.Trigger>
      </DatePicker.Control>

      <Portal>
        <DatePicker.Positioner>
          <DatePicker.Content className="dpf-content">
            {!isMonth && (
              <DatePicker.View view="day">
                <DatePicker.Context>
                  {(api) => (
                    <>
                      <ViewControl />
                      <DatePicker.Table className="dpf-table">
                        <DatePicker.TableHead>
                          <DatePicker.TableRow>
                            {api.weekDays.map((wd, i) => (
                              <DatePicker.TableHeader key={i} className="dpf-weekday">{wd.narrow}</DatePicker.TableHeader>
                            ))}
                          </DatePicker.TableRow>
                        </DatePicker.TableHead>
                        <DatePicker.TableBody>
                          {api.weeks.map((week, i) => (
                            <DatePicker.TableRow key={i}>
                              {week.map((day, j) => (
                                <DatePicker.TableCell key={j} value={day} className="dpf-cell">
                                  <DatePicker.TableCellTrigger className="dpf-day">{day.day}</DatePicker.TableCellTrigger>
                                </DatePicker.TableCell>
                              ))}
                            </DatePicker.TableRow>
                          ))}
                        </DatePicker.TableBody>
                      </DatePicker.Table>
                    </>
                  )}
                </DatePicker.Context>
              </DatePicker.View>
            )}

            <DatePicker.View view="month">
              <DatePicker.Context>
                {(api) => (
                  <>
                    <ViewControl />
                    <DatePicker.Table className="dpf-table">
                      <DatePicker.TableBody>
                        {api.getMonthsGrid({ columns: 3, format: 'short' }).map((row, i) => (
                          <DatePicker.TableRow key={i}>
                            {row.map((month, j) => (
                              <DatePicker.TableCell key={j} value={month.value} className="dpf-cell">
                                <DatePicker.TableCellTrigger className="dpf-chunk">{month.label}</DatePicker.TableCellTrigger>
                              </DatePicker.TableCell>
                            ))}
                          </DatePicker.TableRow>
                        ))}
                      </DatePicker.TableBody>
                    </DatePicker.Table>
                  </>
                )}
              </DatePicker.Context>
            </DatePicker.View>

            <DatePicker.View view="year">
              <DatePicker.Context>
                {(api) => (
                  <>
                    <ViewControl />
                    <DatePicker.Table className="dpf-table">
                      <DatePicker.TableBody>
                        {api.getYearsGrid({ columns: 3 }).map((row, i) => (
                          <DatePicker.TableRow key={i}>
                            {row.map((year, j) => (
                              <DatePicker.TableCell key={j} value={year.value} className="dpf-cell">
                                <DatePicker.TableCellTrigger className="dpf-chunk">{year.label}</DatePicker.TableCellTrigger>
                              </DatePicker.TableCell>
                            ))}
                          </DatePicker.TableRow>
                        ))}
                      </DatePicker.TableBody>
                    </DatePicker.Table>
                  </>
                )}
              </DatePicker.Context>
            </DatePicker.View>
          </DatePicker.Content>
        </DatePicker.Positioner>
      </Portal>
    </DatePicker.Root>
  );
}
