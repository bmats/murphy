interface Fractions {
  [key: string]: number;
}

export default class Progress {
  private _fractions: Fractions;
  private _step: number;
  private _currentFraction: number;

  constructor(fractions: Fractions) {
    this._fractions = fractions;
    this.reset();
  }

  advance(): Progress {
    if (this._step < Object.keys(this._fractions).length)
      ++this._step;
    this._currentFraction = 0;
    return this;
  }

  reset(): Progress {
    this._step = 0;
    this._currentFraction = 0;
    return this;
  }

  current(fraction: number): Progress {
    this._currentFraction = fraction;
    return this;
  }

  get value(): number {
    let total: number = 0;

    Object.keys(this._fractions)
      .slice(0, this._step + 1)
      .forEach((stepName, i) =>
        total += this._fractions[stepName] *
          (i === this._step ? this._currentFraction : 1)
      );

    return total;
  }
}
