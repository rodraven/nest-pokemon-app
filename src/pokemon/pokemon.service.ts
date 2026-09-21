import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreatePokemonDto } from './dto/create-pokemon.dto';
import { UpdatePokemonDto } from './dto/update-pokemon.dto';
import { isValidObjectId, Model } from 'mongoose';
import { Pokemon } from './entities/pokemon.entity';
import { InjectModel } from '@nestjs/mongoose';
import { PaginationDTO } from 'src/common/dto/pagination.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PokemonService {

  private defaultLimit: number;

  constructor(
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<Pokemon>,
    private readonly configService: ConfigService
  ) {

      this.defaultLimit = this.configService.get<number>('default_limit', 7);
  
   }


  async create(createPokemonDto: CreatePokemonDto) {

    createPokemonDto.name = createPokemonDto.name.toLowerCase();
    console.log(createPokemonDto)

    try {
      const pokemon = await this.pokemonModel.create(createPokemonDto);
      return pokemon;

    }
    catch (error) {
        this.handleExeptions(error);
    }


  }

  findAll(paginationDTO: PaginationDTO) {
    
    const {limit = this.defaultLimit, offset = 0} = paginationDTO;

    return this.pokemonModel.find().limit(limit).skip(offset)
    .sort({
      no:1
    })
    .select('-__v');
  }

  async findOne(term: string) {

    let pokemon: Pokemon | null = null;
    if (!isNaN(+term)) {
      pokemon = await this.pokemonModel.findOne({ no: +term });
    }

    if (!pokemon && isValidObjectId(term)) {
      pokemon = await this.pokemonModel.findById(term);

    }

    if (!pokemon) {
      pokemon = await this.pokemonModel.findOne({ name: term.toLowerCase().trim() });
    }


    if (!pokemon) {
      throw new NotFoundException(`Pokemon with id, name or no  "${term}" not found`);
    }

    return pokemon;
  }

  async update(term: string, updatePokemonDto: UpdatePokemonDto) {

    const pokemon = await this.findOne(term);
    if (updatePokemonDto.name) {
      console.log(pokemon);
      updatePokemonDto.name = updatePokemonDto.name.toLowerCase();
    }

    try {
      await pokemon.updateOne(updatePokemonDto, { new: true });
      return { ...pokemon.toJSON(), ...updatePokemonDto };
    }
    catch (error) {
        this.handleExeptions(error);
    }

  }

  async remove(id: string) {
    
    const { deletedCount, acknowledged} = await this.pokemonModel.deleteOne({_id: id});
    if(deletedCount === 0){
      throw new BadRequestException(`Pokemon with id "${id}" not found`)
    }
    return;


  }



  private handleExeptions(error: any) {
    if (error.code === 11000) {
      throw new BadRequestException(`Pokemont exist in db ${JSON.stringify(error.keyValue)}`)
    }
    throw new InternalServerErrorException(`Error inesperado`)
  }
}
