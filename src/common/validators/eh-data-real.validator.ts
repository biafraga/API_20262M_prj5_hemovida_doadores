import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
import { ehDataReal } from '../helpers/data';

export function EhDataReal(options?: ValidationOptions) {
  return function (objeto: object, propriedade: string): void {
    registerDecorator({
      name: 'ehDataReal',
      target: objeto.constructor,
      propertyName: propriedade,
      options,
      validator: {
        validate(valor: unknown): boolean {
          return typeof valor === 'string' && ehDataReal(valor);
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} deve ser uma data real no formato AAAA-MM-DD (ex.: 1995-03-10)`;
        },
      },
    });
  };
}