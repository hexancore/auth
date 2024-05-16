import { Dto, OK, ERR, type R } from "@hexancore/common";
import { Controller, Get, UseGuards, Param, ParseIntPipe } from "@nestjs/common";
import { AuthenticatedSessionGuard } from "../../../../../";

class CatDto extends Dto {
  public constructor(
    public id: number,
    public name: string,
    public age: number
  ) {
    super();
  }
}

@Controller({ path: '/cat/protected/cats' })
export class ProtectedCatsController {
  private cats: Map<number, CatDto>;

  public constructor() {
    this.cats = new Map([
      [1, new CatDto(1, 'Mistral', 5)],
      [2, new CatDto(2, 'Cirrus', 8)],
      [3, new CatDto(3, 'Gizmo', 3)],
      [4, new CatDto(4, 'Saffron ', 10)],
      [5, new CatDto(5, 'Nebula', 15)],
      [6, new CatDto(6, 'Kabuki', 35)],
    ]);
  }

  @Get('')
  @UseGuards(AuthenticatedSessionGuard)
  public getList(): R<CatDto[]> {
    return OK(Array.from(this.cats.values()));
  }

  @Get('/:id')
  @UseGuards(AuthenticatedSessionGuard)
  public get(@Param('id', ParseIntPipe) id: number): R<CatDto, 'cat.domain.cat.not_found'> {
    const cat = this.cats.get(id);
    if (cat) {
      return OK(cat);
    }

    return ERR('cat.domain.cat.not_found');
  }
}