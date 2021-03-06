/* Copyright (c) 2020 SAP SE or an SAP affiliate company. All rights reserved. */

import { toPropertyFormat, toStaticPropertyFormat } from '@sap-cloud-sdk/core';
import voca from 'voca';
import { stripPrefix } from './internal-prefix';
import {
  applyPrefixOnJsConfictFunctionImports,
  applySuffixOnConflictUnderscore
} from './name-formatting-strategies';

export class ServiceNameFormatter {
  private serviceWideNamesCache: string[] = [
    'BinaryField',
    'NumberField',
    'Moment',
    'BigNumber',
    'BigNumberField',
    'StringField',
    'DateField',
    'AllFields',
    'CustomField',
    'Entity',
    'EntityBuilderType',
    'Selectable',
    'OneToOneLink',
    'BooleanField',
    'Link',
    'Time',
    'TimeField'
  ];

  private parameterNamesCache: { [functionImportName: string]: string[] } = {};
  private staticPropertyNamesCache: {
    [entitySetOrComplexTypeName: string]: string[];
  } = {};
  private instancePropertyNamesCache: {
    [entitySetOrComplexTypeName: string]: string[];
  } = {};

  constructor(
    entitySetNames: string[],
    complexTypeNames: string[],
    functionImportNames: string[]
  ) {
    // Here we assume that entitysets and complextypes cannot have the same original name
    [...entitySetNames, ...complexTypeNames].forEach(
      entitySetOrComplexTypeName => {
        this.staticPropertyNamesCache[entitySetOrComplexTypeName] = [];
        this.instancePropertyNamesCache[entitySetOrComplexTypeName] = [];
      }
    );

    functionImportNames.forEach(functionImportName => {
      this.parameterNamesCache[functionImportName] = [];
    });
  }

  originalToServiceName(name: string): string {
    let formattedName = name.replace(/\.|\//g, '_');
    formattedName = stripAPIUnderscore(formattedName);
    formattedName = stripUnderscoreSrv(formattedName);
    formattedName = voca.kebabCase(formattedName);
    return formattedName.endsWith('service')
      ? formattedName
      : `${formattedName}-service`;
  }

  originalToStaticPropertyName(
    originalContainerTypeName: string,
    originalPropertyName: string
  ): string {
    const transformedName = toStaticPropertyFormat(
      stripPrefix(originalPropertyName)
    );
    return applySuffixOnConflictUnderscore(
      transformedName,
      this.staticPropertyNamesCache[originalContainerTypeName]
    );
  }

  originalToInstancePropertyName(
    originalContainerTypeName: string,
    originalPropertyName: string
  ): string {
    const transformedName = toPropertyFormat(stripPrefix(originalPropertyName));
    return applySuffixOnConflictUnderscore(
      transformedName,
      this.instancePropertyNamesCache[originalContainerTypeName]
    );
  }

  originalToFunctionImportName(str: string): string {
    const transformedName = voca.camelCase(str);
    return applyPrefixOnJsConfictFunctionImports(
      applySuffixOnConflictUnderscore(
        transformedName,
        this.serviceWideNamesCache
      )
    );
  }

  originalToComplexTypeName(str: string): string {
    const transformedName = stripAUnderscore(voca.titleCase(str)).replace(
      '_',
      ''
    );
    return applySuffixOnConflictUnderscore(
      transformedName,
      this.serviceWideNamesCache
    );
  }

  typeNameToFactoryName(str: string, reservedNames: Set<string>): string {
    let factoryName = `create${str}`;
    let index = 1;
    while (reservedNames.has(factoryName)) {
      factoryName = `${factoryName}_${index}`;
      index += 1;
    }
    return applySuffixOnConflictUnderscore(
      factoryName,
      this.serviceWideNamesCache
    );
  }

  originalToNavigationPropertyName(
    entitySetName: string,
    originalPropertyName: string
  ): string {
    const transformedName = voca.camelCase(originalPropertyName);
    return applySuffixOnConflictUnderscore(
      transformedName,
      this.instancePropertyNamesCache[entitySetName]
    );
  }

  originalToParameterName(
    originalFunctionImportName: string,
    originalParameterName: string
  ): string {
    const transformedName = voca.camelCase(originalParameterName);
    return applySuffixOnConflictUnderscore(
      transformedName,
      this.parameterNamesCache[originalFunctionImportName]
    );
  }

  originalToEntityClassName(entitySetName: string): string {
    let transformedName = entitySetName;
    if (transformedName.endsWith('Collection')) {
      transformedName = stripCollection(entitySetName);
    }

    transformedName = stripAUnderscore(voca.titleCase(transformedName));
    const newName = applySuffixOnConflictUnderscore(
      transformedName,
      this.serviceWideNamesCache
    );
    // E.g., Both <newName>Type and <newName>TypeForceMandatory are generated by the generator. Therefore, they are added to the cache, so that new entity names will not face naming conflicts.
    this.serviceWideNamesCache.push(...getInterfaceNames(newName));
    return newName;
  }

  directoryToSpeakingModuleName(packageName: string): string {
    return voca.titleCase(packageName.replace(/-/g, ' '));
  }
}

function stripUnderscoreSrv(name: string) {
  return name.endsWith('_SRV') ? name.substr(0, name.length - 4) : name;
}

function stripAPIUnderscore(name: string) {
  return name.startsWith('API_') ? name.substring(4, name.length) : name;
}

export function stripCollection(name: string) {
  return name.endsWith('Collection')
    ? name.substring(0, name.length - 10)
    : name;
}

function stripAUnderscore(name: string) {
  return name.startsWith('A_') ? name.substring(2, name.length) : name;
}

function getInterfaceNames(entitySetName: string): string[] {
  return [`${entitySetName}Type`, `${entitySetName}TypeForceMandatory`];
}
